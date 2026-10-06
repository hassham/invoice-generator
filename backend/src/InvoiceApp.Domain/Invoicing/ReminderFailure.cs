namespace InvoiceApp.Domain.Invoicing;

public sealed class ReminderFailure
{
    public Guid Id { get; set; }

    public Guid InvoiceId { get; set; }

    public Guid ReminderRuleId { get; set; }

    public string FailureReason { get; set; } = string.Empty;

    public int RetryCount { get; set; }

    public int MaxRetries { get; set; } = 3;

    public bool IsResolved { get; set; }

    public DateTimeOffset? LastRetryAt { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }
}
