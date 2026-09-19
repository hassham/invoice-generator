using InvoiceApp.Domain.Invoicing;

namespace InvoiceApp.Domain.Estimates;

/// <summary>
/// IG-220: a deliberately separate entity/table from Invoice, not a shared table with a
/// discriminator - confirmed with the user. Estimates have no payment concepts (no AmountPaid/
/// AmountDue/PublicToken) and their own status lifecycle (EstimateStatus), so mirroring Invoice's
/// exact shape here would carry fields that make no sense for a quote that was never paid.
/// ExpiryDate plays the role Invoice.DueDate plays structurally (the shared frontend editor's
/// "Due Date" field maps onto this one), but is named for what it actually means on an estimate -
/// how long the quoted price is valid for, not a payment deadline.
/// </summary>
public sealed class Estimate
{
    public Guid Id { get; set; }

    public Guid BusinessId { get; set; }

    public Guid CustomerId { get; set; }

    public string EstimateNumber { get; set; } = string.Empty;

    public EstimateStatus Status { get; set; } = EstimateStatus.Draft;

    public DateOnly IssueDate { get; set; }

    public DateOnly ExpiryDate { get; set; }

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

    public string? Notes { get; set; }

    public string? Terms { get; set; }

    public string? PaymentInstructions { get; set; }

    public Guid? TemplateId { get; set; }

    public string? TemplateSettings { get; set; }

    public bool IsDeleted { get; set; }

    public DateTimeOffset? DeletedAt { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }

    public ICollection<EstimateItem> Items { get; init; } = new List<EstimateItem>();
}
