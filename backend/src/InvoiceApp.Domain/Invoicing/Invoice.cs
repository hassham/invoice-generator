namespace InvoiceApp.Domain.Invoicing;

public sealed class Invoice
{
    public Guid Id { get; set; }

    public Guid BusinessId { get; set; }

    public Guid CustomerId { get; set; }

    public string InvoiceNumber { get; set; } = string.Empty;

    public InvoiceStatus Status { get; set; } = InvoiceStatus.Draft;

    public DateOnly IssueDate { get; set; }

    public DateOnly DueDate { get; set; }

    public string Currency { get; set; } = string.Empty;

    public string? Reference { get; set; }

    public string CustomerSnapshot { get; set; } = string.Empty;

    public string SellerSnapshot { get; set; } = string.Empty;

    public DiscountType DiscountType { get; set; } = DiscountType.None;

    public decimal? DiscountValue { get; set; }

    public decimal Subtotal { get; set; }

    public decimal DiscountAmount { get; set; }

    public decimal TaxAmount { get; set; }

    public decimal TotalAmount { get; set; }

    public decimal AmountPaid { get; set; }

    public decimal AmountDue { get; set; }

    public string? Notes { get; set; }

    public string? Terms { get; set; }

    public string? PaymentInstructions { get; set; }

    public Guid? TemplateId { get; set; }

    public string? TemplateSettings { get; set; }

    public bool IsDeleted { get; set; }

    public DateTimeOffset? DeletedAt { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }

    public ICollection<InvoiceItem> Items { get; init; } = new List<InvoiceItem>();
}
