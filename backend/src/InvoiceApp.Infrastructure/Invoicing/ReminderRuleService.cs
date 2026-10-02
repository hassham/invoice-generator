using InvoiceApp.Application.Invoicing;
using InvoiceApp.Domain.Invoicing;
using InvoiceApp.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace InvoiceApp.Infrastructure.Invoicing;

public sealed class ReminderRuleService(ApplicationDbContext dbContext) : IReminderRuleService
{
    public async Task<List<ReminderRuleDto>> ListByBusinessAsync(
        Guid userId,
        Guid businessId,
        CancellationToken cancellationToken)
    {
        var business = await dbContext.Businesses
            .FirstOrDefaultAsync(b => b.Id == businessId && b.UserId == userId, cancellationToken);

        if (business == null)
            throw new InvalidOperationException("Business not found or access denied.");

        var rules = await dbContext.ReminderRules
            .Where(r => r.BusinessId == businessId && r.IsActive)
            .OrderBy(r => r.TriggerType).ThenBy(r => r.TriggerValue)
            .ToListAsync(cancellationToken);

        return rules.Select(MapToDto).ToList();
    }

    public async Task<ReminderRuleDto> GetAsync(
        Guid userId,
        Guid businessId,
        Guid ruleId,
        CancellationToken cancellationToken)
    {
        var business = await dbContext.Businesses
            .FirstOrDefaultAsync(b => b.Id == businessId && b.UserId == userId, cancellationToken);

        if (business == null)
            throw new InvalidOperationException("Business not found or access denied.");

        var rule = await dbContext.ReminderRules
            .FirstOrDefaultAsync(r => r.Id == ruleId && r.BusinessId == businessId, cancellationToken);

        if (rule == null)
            throw new InvalidOperationException("Reminder rule not found.");

        return MapToDto(rule);
    }

    public async Task<ReminderRuleDto> UpdateAsync(
        Guid userId,
        Guid businessId,
        Guid ruleId,
        UpdateReminderRuleCommand command,
        CancellationToken cancellationToken)
    {
        var business = await dbContext.Businesses
            .FirstOrDefaultAsync(b => b.Id == businessId && b.UserId == userId, cancellationToken);

        if (business == null)
            throw new InvalidOperationException("Business not found or access denied.");

        var rule = await dbContext.ReminderRules
            .FirstOrDefaultAsync(r => r.Id == ruleId && r.BusinessId == businessId, cancellationToken);

        if (rule == null)
            throw new InvalidOperationException("Reminder rule not found.");

        rule.EmailSubject = command.EmailSubject;
        rule.EmailBody = command.EmailBody;
        rule.IsActive = command.IsActive;
        rule.UpdatedAt = DateTimeOffset.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

        return MapToDto(rule);
    }

    public async Task<List<ReminderRuleDto>> InitializeDefaultRulesAsync(
        Guid businessId,
        CancellationToken cancellationToken)
    {
        var existingRules = await dbContext.ReminderRules
            .Where(r => r.BusinessId == businessId)
            .CountAsync(cancellationToken);

        if (existingRules > 0)
            return new List<ReminderRuleDto>();

        var defaultRules = new[]
        {
            new ReminderRule
            {
                Id = Guid.NewGuid(),
                BusinessId = businessId,
                TriggerType = ReminderTriggerType.BeforeDue,
                TriggerValue = 3,
                EmailSubject = "Invoice Due in 3 Days",
                EmailBody = "Your invoice is due in 3 days.",
                IsActive = true,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow,
            },
            new ReminderRule
            {
                Id = Guid.NewGuid(),
                BusinessId = businessId,
                TriggerType = ReminderTriggerType.OnDue,
                TriggerValue = 0,
                EmailSubject = "Invoice Due Today",
                EmailBody = "Your invoice is due today.",
                IsActive = true,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow,
            },
            new ReminderRule
            {
                Id = Guid.NewGuid(),
                BusinessId = businessId,
                TriggerType = ReminderTriggerType.DaysOverdue,
                TriggerValue = 3,
                EmailSubject = "Invoice 3 Days Overdue",
                EmailBody = "Your invoice is now 3 days overdue.",
                IsActive = true,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow,
            },
            new ReminderRule
            {
                Id = Guid.NewGuid(),
                BusinessId = businessId,
                TriggerType = ReminderTriggerType.DaysOverdue,
                TriggerValue = 7,
                EmailSubject = "Invoice 7 Days Overdue",
                EmailBody = "Your invoice is now 7 days overdue.",
                IsActive = true,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow,
            },
            new ReminderRule
            {
                Id = Guid.NewGuid(),
                BusinessId = businessId,
                TriggerType = ReminderTriggerType.DaysOverdue,
                TriggerValue = 14,
                EmailSubject = "Invoice 14 Days Overdue",
                EmailBody = "Your invoice is now 14 days overdue.",
                IsActive = true,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow,
            },
        };

        dbContext.ReminderRules.AddRange(defaultRules);
        await dbContext.SaveChangesAsync(cancellationToken);

        return defaultRules.Select(MapToDto).ToList();
    }

    private static ReminderRuleDto MapToDto(ReminderRule rule)
    {
        return new ReminderRuleDto(
            rule.Id,
            rule.TriggerType.ToString(),
            rule.TriggerValue,
            rule.EmailSubject,
            rule.EmailBody,
            rule.IsActive,
            rule.CreatedAt);
    }
}
