namespace InvoiceApp.Domain.Invoicing;

public enum ReminderTriggerType
{
    BeforeDue = 1,
    OnDue = 2,
    DaysOverdue = 3,
}
