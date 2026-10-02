namespace InvoiceApp.Domain.Invoicing;

public sealed class ReminderSent
{
    public Guid Id { get; set; }

    public Guid InvoiceId { get; set; }

    public Guid ReminderRuleId { get; set; }

    public DateTimeOffset SentAt { get; set; }
}
