namespace InvoiceApp.Application.Invoicing;

public sealed record InvoiceLineItemCalculationResult(decimal LineSubtotal, decimal TaxAmount, decimal LineTotal);

public sealed record InvoiceCalculationResult(
    IReadOnlyList<InvoiceLineItemCalculationResult> Items,
    decimal Subtotal,
    decimal DiscountAmount,
    decimal TaxAmount,
    decimal TotalAmount,
    decimal AmountDue);
