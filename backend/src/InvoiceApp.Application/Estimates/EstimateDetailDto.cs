using InvoiceApp.Domain.Businesses;
using InvoiceApp.Domain.Estimates;
using InvoiceApp.Domain.Invoicing;

namespace InvoiceApp.Application.Estimates;

/// <summary>Mirrors InvoiceDetailLineItem.</summary>
public sealed record EstimateDetailLineItem(
    string Description,
    decimal Quantity,
    string? Unit,
    decimal UnitPrice,
    decimal TaxRate,
    decimal Discount);

/// <summary>Mirrors InvoiceDetailDto - the full editable content of a saved estimate.</summary>
public sealed record EstimateDetailDto(
    Guid Id,
    Guid CustomerId,
    string EstimateNumber,
    EstimateStatus Status,
    DateOnly IssueDate,
    DateOnly ExpiryDate,
    string? Reference,
    string Currency,
    string Seller,
    string Customer,
    string? ShipTo,
    IReadOnlyList<EstimateDetailLineItem> Items,
    DiscountType DiscountType,
    decimal? DiscountValue,
    string? Notes,
    string? Terms,
    string? PaymentInstructions,
    Guid? TemplateId,
    EstimateSaveTemplateCustomization? TemplateCustomization,
    decimal Subtotal,
    decimal DiscountAmount,
    decimal TaxAmount,
    decimal TotalAmount,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);
