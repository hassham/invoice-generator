namespace InvoiceApp.Domain.Invoicing;

/// <summary>
/// IG-311: a recurring schedule whose invoice generation failed. Deliberately the same shape as
/// <see cref="ReminderFailure"/> — bounded retries, a reason, and an <c>IsResolved</c> flag that
/// means "a human dealt with it" rather than "the system gave up". Before this, a generation
/// failure was written to the log and nowhere else, so a schedule failing every night was
/// invisible to the person being under-billed.
/// </summary>
public sealed class RecurringGenerationFailure
{
    public Guid Id { get; set; }

    public Guid RecurringScheduleId { get; set; }

    public string FailureReason { get; set; } = string.Empty;

    public int RetryCount { get; set; }

    public int MaxRetries { get; set; } = 3;

    /// <summary>
    /// Set only by a person resolving the failure, never by the job. Resolving makes the schedule
    /// eligible to generate again — the same contract as <see cref="ReminderFailure"/>, learned
    /// the hard way under IG-233, where the job marked exhausted failures resolved and they
    /// disappeared from the list at the moment they became permanent.
    /// </summary>
    public bool IsResolved { get; set; }

    public DateTimeOffset? LastRetryAt { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }
}
