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

        var count = 0;
        foreach (var schedule in dueSchedules)
        {
            try
            {
                if (await GenerateInvoiceFromScheduleAsync(dbContext, schedule, today, cancellationToken))
                {
                    count++;
                }
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error generating invoice for schedule {ScheduleId}", schedule.Id);
            }
        }

        if (count > 0)
        {
            await dbContext.SaveChangesAsync(cancellationToken);
            logger.LogInformation("Generated {Count} invoices from recurring schedules", count);
        }
    }

    private async Task<bool> GenerateInvoiceFromScheduleAsync(
        ApplicationDbContext dbContext,
        RecurringSchedule schedule,
        DateOnly today,
        CancellationToken cancellationToken)
    {
        var template = await dbContext.Invoices
            .Include(i => i.Items)
            .FirstOrDefaultAsync(i => i.Id == schedule.InvoiceTemplateId && !i.IsDeleted, cancellationToken);

        if (template == null)
        {
            logger.LogWarning("Template invoice not found for schedule {ScheduleId}", schedule.Id);
            return false;
        }

        var business = await dbContext.Businesses
            .FirstOrDefaultAsync(b => b.Id == schedule.BusinessId, cancellationToken);

        if (business == null)
        {
            logger.LogWarning("Business not found for schedule {ScheduleId}", schedule.Id);
            return false;
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
        return true;
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
