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

    private async Task ProcessRemindersAsync(CancellationToken cancellationToken)
    {
        using var scope = serviceProvider.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var invoices = await dbContext.Invoices
            .Where(i => !i.IsDeleted && i.Status != InvoiceStatus.Paid && i.Status != InvoiceStatus.Cancelled)
            .ToListAsync(cancellationToken);

        var reminderRules = await dbContext.ReminderRules
            .Where(r => r.IsActive)
            .ToListAsync(cancellationToken);

        var sentReminders = await dbContext.RemindersSent
            .Select(rs => new { rs.InvoiceId, rs.ReminderRuleId })
            .ToListAsync(cancellationToken);

        var sentSet = new HashSet<(Guid, Guid)>(sentReminders.Select(sr => (sr.InvoiceId, sr.ReminderRuleId)));
        var count = 0;

        foreach (var invoice in invoices)
        {
            foreach (var rule in reminderRules.Where(r => r.BusinessId == invoice.BusinessId))
            {
                if (sentSet.Contains((invoice.Id, rule.Id)))
                    continue;

                if (ShouldSendReminder(invoice.DueDate, rule, today))
                {
                    var reminder = new ReminderSent
                    {
                        Id = Guid.NewGuid(),
                        InvoiceId = invoice.Id,
                        ReminderRuleId = rule.Id,
                        SentAt = DateTimeOffset.UtcNow,
                    };

                    dbContext.RemindersSent.Add(reminder);
                    count++;

                    logger.LogInformation(
                        "Recorded reminder for invoice {InvoiceId} with rule {RuleId}",
                        invoice.Id, rule.Id);
                }
            }
        }

        if (count > 0)
        {
            await dbContext.SaveChangesAsync(cancellationToken);
            logger.LogInformation("Processed {Count} payment reminders", count);
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
