namespace InvoiceApp.Domain.Businesses;

public sealed class Business
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }

    public string BusinessName { get; set; } = string.Empty;

    public string? LegalName { get; set; }

    public string? Email { get; set; }

    public string? Phone { get; set; }

    public string? Website { get; set; }

    public string? AddressLine1 { get; set; }

    public string? AddressLine2 { get; set; }

    public string? City { get; set; }

    public string? State { get; set; }

    public string? PostalCode { get; set; }

    public string Country { get; set; } = string.Empty;

    public string? RegistrationNumber { get; set; }

    public string? TaxNumber { get; set; }

    public string DefaultCurrency { get; set; } = string.Empty;

    public decimal DefaultTaxRate { get; set; }

    public TaxCalculationMethod TaxCalculationMethod { get; set; } = TaxCalculationMethod.Exclusive;

    public string InvoicePrefix { get; set; } = "INV-";

    public int NextInvoiceNumber { get; set; } = 1;

    public int InvoiceNumberPadding { get; set; } = 4;

    /// <summary>IG-220: an estimate's own independent numbering sequence - mirrors InvoicePrefix/
    /// NextInvoiceNumber/InvoiceNumberPadding exactly, but estimates and invoices must never share
    /// one counter (an accepted-and-converted estimate becomes a separate Invoice row with its own
    /// number from the invoice sequence, not this one).</summary>
    public string EstimatePrefix { get; set; } = "EST-";

    public int NextEstimateNumber { get; set; } = 1;

    public int EstimateNumberPadding { get; set; } = 4;

    public PaymentTermsOption DefaultPaymentTerms { get; set; } = PaymentTermsOption.DueOnReceipt;

    public int? DefaultPaymentTermsDays { get; set; }

    public string? DefaultInvoiceNotes { get; set; }

    public string? DefaultTermsAndConditions { get; set; }

    public Guid? DefaultTemplateId { get; set; }

    public string? LogoUrl { get; set; }

    /// <summary>IG-219: the connected Stripe account (acct_...) that this business's own
    /// customers pay directly, via OAuth's Standard Connect flow - never a payment
    /// method/card detail, this app never handles those (IG-216's own AC). Null means this
    /// business has no Stripe account connected, which IG-219's AC ties directly to hiding the
    /// hosted invoice page's Pay Now button.</summary>
    public string? StripeAccountId { get; set; }

    public DateTimeOffset? StripeConnectedAt { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }
}
