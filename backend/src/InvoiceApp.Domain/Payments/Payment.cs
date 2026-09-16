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

    /// <summary>Null for a payment recorded automatically from Stripe Checkout (IG-216) - there's
    /// no acting account user for a customer paying an anonymous hosted invoice, unlike every
    /// manually-recorded payment via PaymentService.RecordAsync.</summary>
    public Guid? CreatedBy { get; set; }

    /// <summary>IG-216: the Stripe Checkout Session id that produced this payment, null for a
    /// manually-recorded one. Used only to make hosted-checkout confirmation idempotent (a
    /// customer reloading the post-payment redirect must never record the same payment twice) -
    /// never surfaced to the account owner.</summary>
    public string? StripeCheckoutSessionId { get; set; }
}
