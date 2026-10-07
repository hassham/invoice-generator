namespace InvoiceApp.Application.Purchasing;

public sealed record PurchaseOrderDto(
    Guid Id,
    Guid BusinessId,
    string BusinessName,
    Guid SupplierId,
    string SupplierName,
    string PONumber,
    DateOnly IssueDate,
    DateOnly DueDate,
    string Currency,
    string? Reference,
    decimal Subtotal,
    decimal TaxAmount,
    decimal TotalAmount,
    string? Notes,
    string? Terms,
    string? DeliveryInstructions,
    IReadOnlyList<PurchaseOrderItemDto> Items,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record PurchaseOrderItemDto(
    string Description,
    decimal Quantity,
    string? Unit,
    decimal UnitPrice,
    decimal TaxRate,
    decimal Discount,
    decimal LineSubtotal,
    decimal TaxAmount,
    decimal LineTotal);

public sealed record CreatePurchaseOrderCommand(
    Guid SupplierId,
    DateOnly IssueDate,
    DateOnly DueDate,
    string Currency,
    string? Reference,
    List<PurchaseOrderLineItem> Items,
    string? Notes,
    string? Terms,
    string? DeliveryInstructions,
    Guid? TemplateId,
    string? TemplateCustomization);

public sealed record PurchaseOrderLineItem(
    string Description,
    decimal Quantity,
    string? Unit,
    decimal UnitPrice,
    decimal TaxRate,
    decimal Discount);
