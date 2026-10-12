namespace InvoiceApp.Domain.Invoicing;

/// <summary>
/// IG-315: Draft means unpaid, not "never issued". Whether an invoice was ever issued to the
/// customer is recorded by Invoice.IssuedAt, because a sent-but-unpaid invoice has the same status
/// as one that was never sent. Sent and Viewed were removed: nothing ever assigned them.
/// </summary>
public enum InvoiceStatus
{
    Draft,
    PartiallyPaid,
    Paid,
    Overdue,
    Cancelled,
}
