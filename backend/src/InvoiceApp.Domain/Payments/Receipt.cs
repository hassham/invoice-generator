namespace InvoiceApp.Domain.Payments;

public sealed class Receipt
{
    public Guid Id { get; set; }
    public Guid PaymentId { get; set; }
    public Guid InvoiceId { get; set; }
    public Guid BusinessId { get; set; }
    public string ReceiptNumber { get; set; } = null!;
    public DateOnly IssueDate { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    // Snapshot of payment details at receipt creation time
    public decimal Amount { get; set; }
    public DateOnly PaymentDate { get; set; }
    public PaymentMethod PaymentMethod { get; set; }
    public string? PaymentReference { get; set; }

    // Snapshot of invoice details for receipt rendering
    public string InvoiceNumber { get; set; } = null!;
    public string Currency { get; set; } = null!;

    // Snapshot of business details for receipt rendering
    public string BusinessName { get; set; } = null!;
    public string? BusinessEmail { get; set; }
}
