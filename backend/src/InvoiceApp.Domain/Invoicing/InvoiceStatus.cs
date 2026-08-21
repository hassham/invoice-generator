namespace InvoiceApp.Domain.Invoicing;

public enum InvoiceStatus
{
    Draft,
    Sent,
    Viewed,
    PartiallyPaid,
    Paid,
    Overdue,
    Cancelled,
}
