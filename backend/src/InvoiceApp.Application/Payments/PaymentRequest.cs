using InvoiceApp.Domain.Payments;

namespace InvoiceApp.Application.Payments;

/// <summary>FSD section 69: Amount/Date/Method are required inputs; the frontend defaults Amount
/// to the invoice's current outstanding balance and Date to today before the user ever submits -
/// both remain freely editable, so the backend accepts whatever value is actually submitted
/// rather than re-deriving either.</summary>
public sealed record PaymentRequest(
    DateOnly PaymentDate,
    decimal Amount,
    PaymentMethod PaymentMethod,
    string? Reference,
    string? Notes);
