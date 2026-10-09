namespace InvoiceApp.Application.Invoicing;

/// <summary>
/// IG-311: a recurring schedule whose generation is failing. Deliberately mirrors
/// <c>ReminderFailureDto</c> — there is no reason for an operator to learn two shapes for the
/// same idea.
/// </summary>
public sealed record RecurringGenerationFailureDto(
    Guid Id,
    Guid RecurringScheduleId,
    string FailureReason,
    int RetryCount,
    int MaxRetries,
    bool IsResolved,
    DateTimeOffset? LastRetryAt,
    DateTimeOffset CreatedAt);

public interface IRecurringGenerationFailureService
{
    /// <summary>Open failures for a business, newest first. Resolved ones are excluded.</summary>
    Task<List<RecurringGenerationFailureDto>> ListUnresolvedByBusinessAsync(
        Guid userId,
        Guid businessId,
        CancellationToken cancellationToken);

    Task<RecurringGenerationFailureDto> GetAsync(
        Guid userId,
        Guid businessId,
        Guid failureId,
        CancellationToken cancellationToken);

    /// <summary>
    /// Marks a failure as dealt with. This also makes the schedule eligible to generate again,
    /// which is the point: an operator who has fixed the cause should not need a database edit to
    /// restart billing.
    /// </summary>
    Task ResolveAsync(
        Guid userId,
        Guid businessId,
        Guid failureId,
        CancellationToken cancellationToken);
}
