namespace InvoiceApp.Domain.Invoicing;

public sealed class CreditNote
{
    public Guid Id { get; set; }

    public Guid BusinessId { get; set; }

    public Guid InvoiceId { get; set; }

    public Guid CustomerId { get; set; }

    public string CreditNoteNumber { get; set; } = string.Empty;

    public DateOnly IssueDate { get; set; }

    public string Reason { get; set; } = string.Empty;

    public string Currency { get; set; } = string.Empty;

    public decimal Amount { get; set; }

    public string Notes { get; set; } = string.Empty;

    public string SellerSnapshot { get; set; } = string.Empty;

    public string CustomerSnapshot { get; set; } = string.Empty;

    public bool IsDeleted { get; set; }

    public DateTimeOffset? DeletedAt { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }
}
