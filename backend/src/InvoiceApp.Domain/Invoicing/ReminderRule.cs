namespace InvoiceApp.Domain.Invoicing;

public sealed class ReminderRule
{
    public Guid Id { get; set; }

    public Guid BusinessId { get; set; }

    public ReminderTriggerType TriggerType { get; set; }

    public int TriggerValue { get; set; }

    public string EmailSubject { get; set; } = string.Empty;

    public string EmailBody { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }
}
