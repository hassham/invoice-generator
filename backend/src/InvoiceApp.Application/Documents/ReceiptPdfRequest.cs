namespace InvoiceApp.Application.Documents;

public sealed record ReceiptPdfRequest(
    string ReceiptNumber,
    DateOnly IssueDate,
    string InvoiceNumber,
    decimal Amount,
    DateOnly PaymentDate,
    string PaymentMethod,
    string Currency,
    string BusinessName,
    string? BusinessEmail,
    string? Logo
);
