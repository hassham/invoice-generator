using InvoiceApp.Domain.Businesses;
using InvoiceApp.Domain.Invoicing;

namespace InvoiceApp.Application.Documents;

/// <summary>
/// A superset of InvoiceApp.Application.Invoicing.InvoiceLineItemCalculationInput - rendering a
/// PDF needs the descriptive text (Description, Unit) that the stateless /calculate endpoint never
/// needed, alongside the same numeric fields used for the authoritative totals.
/// </summary>
public sealed record InvoicePdfLineItem(
    string Description,
    decimal Quantity,
    string? Unit,
    decimal UnitPrice,
    decimal TaxRate,
    decimal Discount);

/// <summary>FSD section 32's 7 structured Payment Instructions fields (Custom Instructions is separate - see InvoicePdfRequest.CustomInstructions).</summary>
public sealed record InvoicePdfPaymentInstructions(
    string? BankName,
    string? AccountName,
    string? Bsb,
    string? AccountNumber,
    string? Iban,
    string? Swift,
    string? PaymentReference);

/// <summary>Matches frontend/app/invoice/create/lib/templateCustomization.ts's TemplateCustomization shape.</summary>
public sealed record InvoiceTemplateCustomization(
    string PrimaryColor,
    string AccentColor,
    string Font,
    string HeaderStyle);

/// <summary>
/// IG-43: stateless PDF-rendering request - the frontend's entire current draft, not a persisted
/// invoice (Epic IG-7 doesn't exist yet). Mirrors InvoiceCalculationRequest's stateless pattern,
/// extended with everything InvoicePreview.tsx renders that /calculate doesn't need (descriptive
/// text, template/appearance, logo).
/// </summary>
public sealed record InvoicePdfRequest(
    string InvoiceNumber,
    DateOnly IssueDate,
    DateOnly DueDate,
    string? Reference,
    string Currency,
    string Seller,
    string Customer,
    string? ShipTo,
    IReadOnlyList<InvoicePdfLineItem> Items,
    DiscountType InvoiceDiscountType,
    decimal? InvoiceDiscountValue,
    TaxCalculationMethod TaxCalculationMethod,
    string? Notes,
    string? Terms,
    string? CustomInstructions,
    InvoicePdfPaymentInstructions? PaymentInstructions,
    string? TemplateCode,
    InvoiceTemplateCustomization? TemplateCustomization,
    string? Logo);
