namespace InvoiceApp.Application.Invoicing;

public interface IReminderFailureService
{
    Task<List<ReminderFailureDto>> ListUnresolvedByBusinessAsync(
        Guid userId,
        Guid businessId,
        CancellationToken cancellationToken);

    Task<ReminderFailureDto> GetAsync(
        Guid userId,
        Guid businessId,
        Guid failureId,
        CancellationToken cancellationToken);

    Task ResolveAsync(
        Guid userId,
        Guid businessId,
        Guid failureId,
        CancellationToken cancellationToken);
}

public record ReminderFailureDto(
    Guid Id,
    Guid InvoiceId,
    Guid ReminderRuleId,
    string FailureReason,
    int RetryCount,
    int MaxRetries,
    bool IsResolved,
    DateTimeOffset? LastRetryAt,
    DateTimeOffset CreatedAt
);
