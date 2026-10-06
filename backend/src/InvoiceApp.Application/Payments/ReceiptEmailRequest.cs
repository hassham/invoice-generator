namespace InvoiceApp.Application.Payments;

/// <summary>IG-290: receipt emails have fixed content, unlike invoices which include
/// free-text message and CC fields. Just the recipient email is needed.</summary>
public sealed record ReceiptEmailRequest(IReadOnlyList<string> To);
