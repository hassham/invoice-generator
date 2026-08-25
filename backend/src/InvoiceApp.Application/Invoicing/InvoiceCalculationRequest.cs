using InvoiceApp.Domain.Businesses;
using InvoiceApp.Domain.Invoicing;

namespace InvoiceApp.Application.Invoicing;

public sealed record InvoiceLineItemCalculationInput(decimal Quantity, decimal UnitPrice, decimal TaxRate, decimal Discount);

public sealed record InvoiceCalculationRequest(
    IReadOnlyList<InvoiceLineItemCalculationInput> Items,
    DiscountType InvoiceDiscountType,
    decimal? InvoiceDiscountValue,
    TaxCalculationMethod TaxCalculationMethod);
