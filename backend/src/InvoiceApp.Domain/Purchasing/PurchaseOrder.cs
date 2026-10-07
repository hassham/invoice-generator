namespace InvoiceApp.Domain.Purchasing;

public sealed class PurchaseOrder
{
    public Guid Id { get; set; }

    public Guid BusinessId { get; set; }

    public Guid SupplierId { get; set; }

    public string PONumber { get; set; } = string.Empty;

    public DateOnly IssueDate { get; set; }

    public DateOnly DueDate { get; set; }

    public string Currency { get; set; } = string.Empty;

    public string? Reference { get; set; }

    public string SupplierSnapshot { get; set; } = string.Empty;

    public string BusinessSnapshot { get; set; } = string.Empty;

    public decimal Subtotal { get; set; }

    public decimal TaxAmount { get; set; }

    public decimal TotalAmount { get; set; }

    public string? Notes { get; set; }

    public string? Terms { get; set; }

    public string? DeliveryInstructions { get; set; }

    public Guid? TemplateId { get; set; }

    public string? TemplateSettings { get; set; }

    public ICollection<PurchaseOrderItem> Items { get; init; } = new List<PurchaseOrderItem>();

    public bool IsDeleted { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }
}
