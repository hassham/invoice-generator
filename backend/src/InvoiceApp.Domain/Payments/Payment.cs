namespace InvoiceApp.Domain.Payments;

public sealed class Payment
{
    public Guid Id { get; set; }

    public Guid InvoiceId { get; set; }

    public DateOnly PaymentDate { get; set; }

    public decimal Amount { get; set; }

    public PaymentMethod PaymentMethod { get; set; }

    public string? Reference { get; set; }

    public string? Notes { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public Guid CreatedBy { get; set; }
}
