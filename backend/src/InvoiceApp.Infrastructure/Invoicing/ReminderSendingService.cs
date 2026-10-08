using InvoiceApp.Application.Email;
using InvoiceApp.Domain.Businesses;
using InvoiceApp.Domain.Invoicing;
using InvoiceApp.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace InvoiceApp.Infrastructure.Invoicing;

/// <summary>
/// IG-232: Background service that sends payment reminders based on configured rules.
/// Runs daily at 03:00 UTC to send reminders for due/overdue invoices.
/// </summary>
public sealed class ReminderSendingService(
    IServiceProvider serviceProvider,
    ILogger<ReminderSendingService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var now = DateTime.UtcNow;
                var nextRun = now.Date.AddDays(1).AddHours(3);
                var delay = nextRun - now;

                if (delay.TotalMilliseconds > 0)
                {
                    await Task.Delay(delay, stoppingToken);
                }

                await ProcessRemindersAsync(stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error processing payment reminders");
            }
        }
    }

    /// <summary>
    /// One pass over every due reminder. Public so a test can drive a single run directly:
    /// <see cref="ExecuteAsync"/> sleeps until 03:00 UTC before its first pass, so going through
    /// the hosted-service loop would mean waiting hours or faking the clock (IG-286).
    /// </summary>
    public async Task ProcessRemindersAsync(CancellationToken cancellationToken)
    {
        using var scope = serviceProvider.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var emailSender = scope.ServiceProvider.GetRequiredService<IEmailSender>();

        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var invoices = await dbContext.Invoices
            .Include(i => i.Items)
            .Where(i => !i.IsDeleted && i.Status != InvoiceStatus.Paid && i.Status != InvoiceStatus.Cancelled)
            .ToListAsync(cancellationToken);

        var customers = await dbContext.Customers
            .ToListAsync(cancellationToken);

        var reminderRules = await dbContext.ReminderRules
            .Where(r => r.IsActive)
            .ToListAsync(cancellationToken);

        var sentReminders = await dbContext.RemindersSent
            .Select(rs => new { rs.InvoiceId, rs.ReminderRuleId })
            .ToListAsync(cancellationToken);

        var sentSet = new HashSet<(Guid, Guid)>(sentReminders.Select(sr => (sr.InvoiceId, sr.ReminderRuleId)));
        var sentCount = 0;
        var failureCount = 0;

        foreach (var invoice in invoices)
        {
            var customer = customers.FirstOrDefault(c => c.Id == invoice.CustomerId);
            if (customer?.Email == null)
                continue;

            foreach (var rule in reminderRules.Where(r => r.BusinessId == invoice.BusinessId))
            {
                if (sentSet.Contains((invoice.Id, rule.Id)))
                    continue;

                if (!ShouldSendReminder(invoice.DueDate, rule, today))
                    continue;

                try
                {
                    var message = new EmailMessage(
                        To: new[] { customer.Email },
                        Cc: new List<string>(),
                        Subject: rule.EmailSubject,
                        PlainTextBody: rule.EmailBody,
                        HtmlBody: $"<p>{System.Net.WebUtility.HtmlEncode(rule.EmailBody)}</p>",
                        Attachments: new List<EmailAttachment>());

                    await emailSender.SendAsync(message, cancellationToken);

                    var reminder = new ReminderSent
                    {
                        Id = Guid.NewGuid(),
                        InvoiceId = invoice.Id,
                        ReminderRuleId = rule.Id,
                        SentAt = DateTimeOffset.UtcNow,
                    };

                    dbContext.RemindersSent.Add(reminder);
                    sentCount++;

                    logger.LogInformation(
                        "Sent reminder for invoice {InvoiceId} to {CustomerEmail}",
                        invoice.Id, customer.Email);
                }
                catch (Exception ex)
                {
                    logger.LogWarning(ex, "Failed to send reminder for invoice {InvoiceId}", invoice.Id);
                    failureCount++;

                    var existingFailure = await dbContext.ReminderFailures
                        .FirstOrDefaultAsync(rf =>
                            rf.InvoiceId == invoice.Id &&
                            rf.ReminderRuleId == rule.Id &&
                            !rf.IsResolved,
                            cancellationToken);

                    if (existingFailure == null)
                    {
                        var failure = new ReminderFailure
                        {
                            Id = Guid.NewGuid(),
                            InvoiceId = invoice.Id,
                            ReminderRuleId = rule.Id,
                            FailureReason = ex.Message,
                            RetryCount = 1,
                            IsResolved = false,
                            LastRetryAt = DateTimeOffset.UtcNow,
                            CreatedAt = DateTimeOffset.UtcNow,
                            UpdatedAt = DateTimeOffset.UtcNow,
                        };
                        dbContext.ReminderFailures.Add(failure);
                    }
                    else
                    {
                        existingFailure.RetryCount++;
                        existingFailure.LastRetryAt = DateTimeOffset.UtcNow;
                        existingFailure.FailureReason = ex.Message;

                        if (existingFailure.RetryCount >= existingFailure.MaxRetries)
                        {
                            existingFailure.IsResolved = true;
                            logger.LogError("Reminder for invoice {InvoiceId} failed {Count} times, marking as resolved",
                                invoice.Id, existingFailure.RetryCount);
                        }

                        existingFailure.UpdatedAt = DateTimeOffset.UtcNow;
                    }
                }
            }
        }

        if (sentCount > 0 || failureCount > 0)
        {
            await dbContext.SaveChangesAsync(cancellationToken);
            logger.LogInformation("Processed reminders: {SentCount} sent, {FailureCount} failed",
                sentCount, failureCount);
        }
    }

    private static bool ShouldSendReminder(DateOnly dueDate, ReminderRule rule, DateOnly today)
    {
        var daysFromDue = today.DayNumber - dueDate.DayNumber;

        return rule.TriggerType switch
        {
            ReminderTriggerType.BeforeDue => daysFromDue == -rule.TriggerValue,
            ReminderTriggerType.OnDue => daysFromDue == 0,
            ReminderTriggerType.DaysOverdue => daysFromDue == rule.TriggerValue && daysFromDue > 0,
            _ => false,
        };
    }
}
