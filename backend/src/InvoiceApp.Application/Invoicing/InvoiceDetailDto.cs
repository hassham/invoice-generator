using InvoiceApp.Domain.Invoicing;

namespace InvoiceApp.Application.Invoicing;

public sealed record InvoiceDetailLineItem(
    string Description,
    decimal Quantity,
    string? Unit,
    decimal UnitPrice,
    decimal TaxRate,
    decimal Discount);

/// <summary>
/// IG-47: the full editable content of a saved invoice, unlike InvoiceDto (which only carries
/// totals - enough for a POST/PUT response, not enough to repopulate an edit form). Payment
/// Instructions is returned as one flat string (matching InvoiceSaveRequest.PaymentInstructions'
/// own storage - the DB has no structured columns for it) rather than the 7 structured fields the
/// create flow accepts, a deliberate, narrower edit-page representation confirmed with the user.
/// </summary>
public sealed record InvoiceDetailDto(
    Guid Id,
    Guid CustomerId,
    string InvoiceNumber,
    InvoiceStatus Status,
    DateOnly IssueDate,
    DateOnly DueDate,
    string? Reference,
    string Currency,
    string Seller,
    string Customer,
    string? ShipTo,
    IReadOnlyList<InvoiceDetailLineItem> Items,
    DiscountType InvoiceDiscountType,
    decimal? InvoiceDiscountValue,
    string? Notes,
    string? Terms,
    string? PaymentInstructions,
    Guid? TemplateId,
    InvoiceSaveTemplateCustomization? TemplateCustomization,
    decimal Subtotal,
    decimal DiscountAmount,
    decimal TaxAmount,
    decimal TotalAmount,
    decimal AmountPaid,
    decimal AmountDue,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);
