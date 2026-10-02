namespace InvoiceApp.Application.Invoicing;

public interface IReminderRuleService
{
    Task<List<ReminderRuleDto>> ListByBusinessAsync(
        Guid userId,
        Guid businessId,
        CancellationToken cancellationToken);

    Task<ReminderRuleDto> GetAsync(
        Guid userId,
        Guid businessId,
        Guid ruleId,
        CancellationToken cancellationToken);

    Task<ReminderRuleDto> UpdateAsync(
        Guid userId,
        Guid businessId,
        Guid ruleId,
        UpdateReminderRuleCommand command,
        CancellationToken cancellationToken);

    Task<List<ReminderRuleDto>> InitializeDefaultRulesAsync(
        Guid businessId,
        CancellationToken cancellationToken);
}

public record CreateReminderRuleCommand(
    string TriggerType,
    int TriggerValue,
    string EmailSubject,
    string EmailBody
);

public record UpdateReminderRuleCommand(
    string EmailSubject,
    string EmailBody,
    bool IsActive
);

public record ReminderRuleDto(
    Guid Id,
    string TriggerType,
    int TriggerValue,
    string EmailSubject,
    string EmailBody,
    bool IsActive,
    DateTimeOffset CreatedAt
);
