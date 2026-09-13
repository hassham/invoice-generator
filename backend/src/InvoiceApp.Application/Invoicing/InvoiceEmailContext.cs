using InvoiceApp.Application.Documents;

namespace InvoiceApp.Application.Invoicing;

/// <summary>Everything InvoiceEndpoints.SendEmailAsync needs to actually build and send the email
/// - bundled into one call so the endpoint doesn't need multiple round trips to InvoiceService for
/// one action.</summary>
public sealed record InvoiceEmailContext(InvoicePdfRequest PdfRequest, string PublicToken, string? BusinessEmail);
