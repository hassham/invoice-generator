namespace InvoiceApp.Domain.Invoicing;

public sealed class RecurringSchedule
{
    public Guid Id { get; set; }

    public Guid BusinessId { get; set; }

    public Guid CustomerId { get; set; }

    public Guid InvoiceTemplateId { get; set; }

    public RecurringScheduleFrequency Frequency { get; set; }

    public DateOnly StartDate { get; set; }

    public DateOnly? EndDate { get; set; }

    public DateOnly NextRunDate { get; set; }

    public bool AutoSend { get; set; }

    public bool IsActive { get; set; } = true;

    public bool IsDeleted { get; set; }

    public DateTimeOffset? DeletedAt { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }
}
