using InvoiceApp.Domain.Businesses;
using InvoiceApp.Domain.Invoicing;

namespace InvoiceApp.Application.Estimates;

/// <summary>Mirrors InvoiceSaveLineItem exactly - the same line-item shape applies to both
/// document types (IG-220: the calculation engine is fully shared, unchanged).</summary>
public sealed record EstimateSaveLineItem(
    string Description,
    decimal Quantity,
    string? Unit,
    decimal UnitPrice,
    decimal TaxRate,
    decimal Discount);

/// <summary>Mirrors InvoiceSavePaymentInstructions - shown as-is on an estimate today (same
/// reasoning as an invoice: nothing structured to reconstruct beyond one flat text column).</summary>
public sealed record EstimateSavePaymentInstructions(
    string? BankName,
    string? AccountName,
    string? Bsb,
    string? AccountNumber,
    string? Iban,
    string? Swift,
    string? PaymentReference);

public sealed record EstimateSaveTemplateCustomization(
    string PrimaryColor,
    string AccentColor,
    string Font,
    string HeaderStyle);

/// <summary>
/// IG-220: the authenticated save request - POST creates, PUT updates, full field parity with
/// InvoiceSaveRequest so the shared editor sub-components/lib modules need no special-casing for
/// "estimates don't have X". TaxCalculationMethod is accepted for the same reason InvoiceSaveRequest
/// takes it - computing totals at save time - but, matching Invoice's own documented gap (no
/// per-invoice column exists either, see InvoiceService.BuildPdfRequestAsync's comment), the choice
/// itself isn't persisted as a column, only the resulting numbers are.
/// </summary>
public sealed record EstimateSaveRequest(
    string EstimateNumber,
    DateOnly IssueDate,
    DateOnly ExpiryDate,
    string? Reference,
    string Currency,
    string Seller,
    string Customer,
    string? ShipTo,
    IReadOnlyList<EstimateSaveLineItem> Items,
    DiscountType DiscountType,
    decimal? DiscountValue,
    TaxCalculationMethod TaxCalculationMethod,
    string? Notes,
    string? Terms,
    string? CustomInstructions,
    EstimateSavePaymentInstructions? PaymentInstructions,
    Guid? TemplateId,
    EstimateSaveTemplateCustomization? TemplateCustomization,
    Guid? CustomerId = null);
