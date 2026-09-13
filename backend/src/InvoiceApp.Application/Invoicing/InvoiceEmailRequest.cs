namespace InvoiceApp.Application.Invoicing;

/// <summary>IG-212: the fields docs/PRD.md section 11 lists - "User enters: Recipient, CC,
/// Subject, Message." The PDF attachment and hosted invoice link are added automatically, not
/// supplied by the caller.</summary>
public sealed record InvoiceEmailRequest(
    IReadOnlyList<string> To,
    IReadOnlyList<string> Cc,
    string Subject,
    string Message);
