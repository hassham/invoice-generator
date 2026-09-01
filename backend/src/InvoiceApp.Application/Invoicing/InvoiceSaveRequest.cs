using InvoiceApp.Domain.Businesses;
using InvoiceApp.Domain.Invoicing;

namespace InvoiceApp.Application.Invoicing;

/// <summary>A superset of InvoiceLineItemCalculationInput - saving needs the descriptive text
/// (Description, Unit) the stateless /calculate endpoint never needed, matching the same pattern
/// InvoicePdfLineItem already uses for the stateless PDF endpoint.</summary>
public sealed record InvoiceSaveLineItem(
    string Description,
    decimal Quantity,
    string? Unit,
    decimal UnitPrice,
    decimal TaxRate,
    decimal Discount);

/// <summary>FSD section 32's 7 structured Payment Instructions fields - the DB has only one flat
/// `payment_instructions` text column, so InvoiceService folds these (plus CustomInstructions) into
/// one formatted block at save time.</summary>
public sealed record InvoiceSavePaymentInstructions(
    string? BankName,
    string? AccountName,
    string? Bsb,
    string? AccountNumber,
    string? Iban,
    string? Swift,
    string? PaymentReference);

public sealed record InvoiceSaveTemplateCustomization(
    string PrimaryColor,
    string AccentColor,
    string Font,
    string HeaderStyle);

/// <summary>
/// IG-45: the authenticated save request - POST creates, PUT updates. Deliberately its own DTO
/// rather than reusing InvoicePdfRequest: persistence needs identity/FK-shaped fields PDF
/// rendering never did (TemplateId: Guid, not TemplateCode: string - the DB stores a template FK,
/// not a code) and has no use for Logo (no column exists for it; logo storage remains client-only,
/// a documented gap since IG-42).
/// </summary>
public sealed record InvoiceSaveRequest(
    string InvoiceNumber,
    DateOnly IssueDate,
    DateOnly DueDate,
    string? Reference,
    string Currency,
    string Seller,
    string Customer,
    string? ShipTo,
    IReadOnlyList<InvoiceSaveLineItem> Items,
    DiscountType InvoiceDiscountType,
    decimal? InvoiceDiscountValue,
    TaxCalculationMethod TaxCalculationMethod,
    string? Notes,
    string? Terms,
    string? CustomInstructions,
    InvoiceSavePaymentInstructions? PaymentInstructions,
    Guid? TemplateId,
    InvoiceSaveTemplateCustomization? TemplateCustomization,
    // IG-56: set when the caller picked an existing saved customer rather than typing free text -
    // used directly (verified account-owned) instead of IG-45's find-or-create-from-text
    // heuristic. Appended last with a default so existing positional callers are unaffected.
    Guid? CustomerId = null);
