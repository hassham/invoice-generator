using InvoiceApp.Application.Invoicing;
using InvoiceApp.Domain.Businesses;
using InvoiceApp.Domain.Invoicing;
using InvoiceApp.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace InvoiceApp.Infrastructure.Invoicing;

/// <summary>
/// IG-230: Background service that generates invoices from recurring schedules.
/// Runs periodically to create invoices when NextRunDate <= today.
/// </summary>
public sealed class RecurringInvoiceGenerationService(
    IServiceProvider serviceProvider,
    ILogger<RecurringInvoiceGenerationService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Run once daily at 02:00 UTC (or immediately if we're past that time today)
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var now = DateTime.UtcNow;
                var nextRun = now.Date.AddDays(1).AddHours(2);
                var delay = nextRun - now;

                if (delay.TotalMilliseconds > 0)
                {
                    await Task.Delay(delay, stoppingToken);
                }

                await ProcessRecurringSchedulesAsync(stoppingToken);
            }
            catch (OperationCanceledException)
            {
                // Expected on shutdown
                break;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error processing recurring schedules");
            }
        }
    }

    /// <summary>
    /// One pass over every due schedule. Public so a test can drive a single run directly:
    /// <see cref="ExecuteAsync"/> sleeps until 02:00 UTC before its first pass, so going through
    /// the hosted-service loop would mean waiting hours or faking the clock (IG-282).
    /// </summary>
    public async Task ProcessRecurringSchedulesAsync(CancellationToken cancellationToken)
    {
        using var scope = serviceProvider.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var dueSchedules = await dbContext.RecurringSchedules
            .Where(rs => rs.IsActive && !rs.IsDeleted &&
                         rs.NextRunDate <= today &&
                         (rs.EndDate == null || rs.EndDate >= today))
            .ToListAsync(cancellationToken);

        // IG-311: a schedule that has already exhausted its retries stops being attempted, the
        // same contract reminders use (IG-233). Unresolved only - resolving a failure is a person
        // saying the cause is fixed, which makes the schedule eligible again.
        var openFailures = await dbContext.RecurringGenerationFailures
            .Where(f => !f.IsResolved)
            .ToListAsync(cancellationToken);

        var exhausted = openFailures
            .Where(f => f.RetryCount >= f.MaxRetries)
            .Select(f => f.RecurringScheduleId)
            .ToHashSet();

        var count = 0;
        var failureCount = 0;
        var pendingSends = new List<PendingAutoSend>();

        foreach (var schedule in dueSchedules)
        {
            if (exhausted.Contains(schedule.Id))
            {
                continue;
            }

            try
            {
                if (await GenerateInvoiceFromScheduleAsync(dbContext, schedule, today, cancellationToken) is { } generated)
                {
                    count++;

                    if (schedule.AutoSend)
                    {
                        // Queued rather than sent here: the invoice row does not exist until the
                        // SaveChangesAsync below, and the dispatcher reads it back from the
                        // database to build the PDF and hosted link.
                        var recipient = await dbContext.Customers
                            .Where(c => c.Id == schedule.CustomerId)
                            .Select(c => c.Email)
                            .FirstOrDefaultAsync(cancellationToken);

                        var ownerId = await dbContext.Businesses
                            .Where(b => b.Id == schedule.BusinessId)
                            .Select(b => b.UserId)
                            .FirstOrDefaultAsync(cancellationToken);

                        if (string.IsNullOrWhiteSpace(recipient))
                        {
                            logger.LogWarning(
                                "Schedule {ScheduleId} has Automatic Send on but its customer has no email address",
                                schedule.Id);
                        }
                        else
                        {
                            pendingSends.Add(new PendingAutoSend(
                                schedule.Id, generated.Id, ownerId, recipient, generated.InvoiceNumber));
                        }
                    }

                    // A run that finally succeeds closes out the failure record, so the list shows
                    // what is actually broken now rather than what once was.
                    var recovered = openFailures.FirstOrDefault(f => f.RecurringScheduleId == schedule.Id);
                    if (recovered is not null)
                    {
                        recovered.IsResolved = true;
                        recovered.UpdatedAt = DateTimeOffset.UtcNow;
                    }
                }
            }
            catch (Exception ex)
            {
                failureCount++;
                logger.LogError(ex, "Error generating invoice for schedule {ScheduleId}", schedule.Id);

                // NextRunDate is deliberately NOT advanced here. Advancing it would silently skip
                // a billing period on a transient failure; leaving it means the schedule is still
                // due tomorrow, and the retry bound above is what stops it trying forever.
                var failure = openFailures.FirstOrDefault(f => f.RecurringScheduleId == schedule.Id);
                if (failure is null)
                {
                    dbContext.RecurringGenerationFailures.Add(new RecurringGenerationFailure
                    {
                        Id = Guid.NewGuid(),
                        RecurringScheduleId = schedule.Id,
                        FailureReason = ex.Message,
                        RetryCount = 1,
                        IsResolved = false,
                        LastRetryAt = DateTimeOffset.UtcNow,
                        CreatedAt = DateTimeOffset.UtcNow,
                        UpdatedAt = DateTimeOffset.UtcNow,
                    });
                }
                else
                {
                    failure.RetryCount++;
                    failure.FailureReason = ex.Message;
                    failure.LastRetryAt = DateTimeOffset.UtcNow;
                    failure.UpdatedAt = DateTimeOffset.UtcNow;

                    if (failure.RetryCount >= failure.MaxRetries)
                    {
                        logger.LogError(
                            "Generation for schedule {ScheduleId} failed {Count} times; giving up until it is resolved",
                            schedule.Id, failure.RetryCount);
                    }
                }
            }
        }

        if (count > 0 || failureCount > 0)
        {
            await dbContext.SaveChangesAsync(cancellationToken);
            logger.LogInformation(
                "Processed recurring schedules: {Count} generated, {FailureCount} failed", count, failureCount);
        }

        await SendAutomaticallyAsync(scope, pendingSends, cancellationToken);
    }

    /// <summary>
    /// IG-311 / IG-230 AC 2: "if Automatic Send is on, the invoice is emailed automatically using
    /// the existing send capability (IG-212)". Before this, <c>AutoSend</c> was stored, returned in
    /// the DTO and never read — switching it on did nothing at all.
    ///
    /// Goes through <see cref="IInvoiceEmailDispatcher"/>, the same path the send-email endpoint
    /// uses, so an automatically sent invoice carries the same PDF and hosted link and lands in the
    /// invoice's email history exactly like a manual send.
    /// </summary>
    private async Task SendAutomaticallyAsync(
        IServiceScope scope,
        IReadOnlyList<PendingAutoSend> pendingSends,
        CancellationToken cancellationToken)
    {
        if (pendingSends.Count == 0)
        {
            return;
        }

        var dispatcher = scope.ServiceProvider.GetRequiredService<IInvoiceEmailDispatcher>();

        foreach (var send in pendingSends)
        {
            var request = new InvoiceEmailRequest(
                To: [send.Recipient],
                Cc: [],
                Subject: $"Invoice {send.InvoiceNumber}",
                Message: $"Please find invoice {send.InvoiceNumber} attached.");

            try
            {
                await dispatcher.SendAsync(send.UserId, send.InvoiceId, request, cancellationToken);
            }
            catch (Exception ex)
            {
                // A failed send must not take the others down with it, and must not undo the
                // generation - the invoice is validly created either way. The dispatcher has
                // already recorded the failure against the invoice's own email history, which is
                // where an email problem belongs; a generation failure it is not.
                logger.LogError(
                    ex,
                    "Automatic send failed for invoice {InvoiceId} from schedule {ScheduleId}",
                    send.InvoiceId, send.ScheduleId);
            }
        }
    }

    /// <summary>An invoice generated from a schedule that asked for it to be sent automatically.</summary>
    private sealed record PendingAutoSend(Guid ScheduleId, Guid InvoiceId, Guid UserId, string Recipient, string InvoiceNumber);

    private async Task<Invoice?> GenerateInvoiceFromScheduleAsync(
        ApplicationDbContext dbContext,
        RecurringSchedule schedule,
        DateOnly today,
        CancellationToken cancellationToken)
    {
        var template = await dbContext.Invoices
            .Include(i => i.Items)
            .FirstOrDefaultAsync(i => i.Id == schedule.InvoiceTemplateId && !i.IsDeleted, cancellationToken);

        // IG-311: these two used to log a warning and return quietly, which meant the most likely
        // real cause of a broken schedule - somebody deleted the invoice it was built from - left
        // no failure record, did not advance NextRunDate, and so retried silently every night
        // forever. They are genuine failures and are surfaced as such.
        if (template == null)
        {
            throw new InvalidOperationException(
                "The invoice this schedule generates from no longer exists. Point the schedule at another invoice.");
        }

        var business = await dbContext.Businesses
            .FirstOrDefaultAsync(b => b.Id == schedule.BusinessId, cancellationToken);

        if (business == null)
        {
            throw new InvalidOperationException("The business this schedule belongs to no longer exists.");
        }

        // IG-312: the generated invoice's figures are recalculated through the very same
        // InvoiceCalculator a manual save uses, rather than copying the template's stored totals.
        // Copying them is what let the old code produce an invoice whose header said 550 while
        // every one of its lines said 0 - and, because the per-line Discount was never carried
        // across at all, bill a discounted retainer at full price. Running the real calculator
        // means the two paths cannot drift apart again.
        var templateItems = template.Items.OrderBy(item => item.SortOrder).ToList();
        var calculation = InvoiceCalculator.Calculate(new InvoiceCalculationRequest(
            templateItems
                .Select(item => new InvoiceLineItemCalculationInput(item.Quantity, item.UnitPrice, item.TaxRate, item.Discount))
                .ToList(),
            template.DiscountType,
            template.DiscountValue,
            // No per-invoice tax-calculation-method column exists (IG-46's documented gap), so this
            // uses the same Exclusive fallback InvoiceService.BuildPdfRequestAsync already assumes
            // for a saved invoice.
            TaxCalculationMethod.Exclusive));

        // Clone the template invoice
        var newInvoice = new Invoice
        {
            Id = Guid.NewGuid(),
            BusinessId = template.BusinessId,
            CustomerId = schedule.CustomerId,
            InvoiceNumber = await GenerateNextInvoiceNumberAsync(dbContext, business, today, cancellationToken),
            Status = InvoiceStatus.Draft,
            IssueDate = today,
            DueDate = CalculateDueDate(today, business.DefaultPaymentTerms),
            Currency = template.Currency,
            Reference = template.Reference,
            CustomerSnapshot = template.CustomerSnapshot,
            SellerSnapshot = template.SellerSnapshot,
            DiscountType = template.DiscountType,
            DiscountValue = template.DiscountValue,
            Subtotal = calculation.Subtotal,
            DiscountAmount = calculation.DiscountAmount,
            TaxAmount = calculation.TaxAmount,
            TotalAmount = calculation.TotalAmount,
            AmountPaid = 0,
            AmountDue = calculation.AmountDue,
            Notes = template.Notes,
            Terms = template.Terms,
            PaymentInstructions = template.PaymentInstructions,
            TemplateId = template.TemplateId,
            TemplateSettings = template.TemplateSettings,
            PublicToken = Guid.NewGuid().ToString("N")[..16],
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };

        // Clone items. Every field the template line carries comes across - Unit, Discount and
        // SourceItemId used to be dropped silently, and the three line figures left at zero.
        for (var i = 0; i < templateItems.Count; i++)
        {
            var item = templateItems[i];
            var lineResult = calculation.Items[i];

            newInvoice.Items.Add(new InvoiceItem
            {
                Id = Guid.NewGuid(),
                InvoiceId = newInvoice.Id,
                SourceItemId = item.SourceItemId,
                Description = item.Description,
                Quantity = item.Quantity,
                Unit = item.Unit,
                UnitPrice = item.UnitPrice,
                TaxRate = item.TaxRate,
                Discount = item.Discount,
                LineSubtotal = lineResult.LineSubtotal,
                TaxAmount = lineResult.TaxAmount,
                LineTotal = lineResult.LineTotal,
                SortOrder = item.SortOrder,
            });
        }

        dbContext.Invoices.Add(newInvoice);

        // Update NextRunDate based on frequency
        schedule.NextRunDate = CalculateNextRunDate(today, schedule.Frequency);
        schedule.UpdatedAt = DateTimeOffset.UtcNow;

        logger.LogInformation("Generated invoice from recurring schedule {ScheduleId}", schedule.Id);
        return newInvoice;
    }

    private async Task<string> GenerateNextInvoiceNumberAsync(
        ApplicationDbContext dbContext,
        Business business,
        DateOnly today,
        CancellationToken cancellationToken)
    {
        var countToday = await dbContext.Invoices
            .CountAsync(i => i.BusinessId == business.Id &&
                             i.IssueDate == today &&
                             !i.IsDeleted,
                         cancellationToken);

        return $"{business.InvoicePrefix}{today:yyyyMMdd}{countToday + 1:D4}";
    }

    private DateOnly CalculateNextRunDate(DateOnly currentDate, RecurringScheduleFrequency frequency)
    {
        return frequency switch
        {
            RecurringScheduleFrequency.Weekly => currentDate.AddDays(7),
            RecurringScheduleFrequency.Fortnightly => currentDate.AddDays(14),
            RecurringScheduleFrequency.Monthly => currentDate.AddMonths(1),
            RecurringScheduleFrequency.Quarterly => currentDate.AddMonths(3),
            RecurringScheduleFrequency.Annually => currentDate.AddYears(1),
            RecurringScheduleFrequency.Custom => currentDate.AddMonths(1), // Default to monthly for custom
            _ => currentDate.AddMonths(1),
        };
    }

    private DateOnly CalculateDueDate(DateOnly issueDate, PaymentTermsOption terms)
    {
        return terms switch
        {
            PaymentTermsOption.DueOnReceipt => issueDate,
            PaymentTermsOption.Net7 => issueDate.AddDays(7),
            PaymentTermsOption.Net14 => issueDate.AddDays(14),
            PaymentTermsOption.Net30 => issueDate.AddDays(30),
            PaymentTermsOption.Net60 => issueDate.AddDays(60),
            PaymentTermsOption.Net90 => issueDate.AddDays(90),
            _ => issueDate.AddDays(30),
        };
    }
}
