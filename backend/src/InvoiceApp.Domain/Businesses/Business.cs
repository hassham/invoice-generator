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

    public PaymentTermsOption DefaultPaymentTerms { get; set; } = PaymentTermsOption.DueOnReceipt;

    public int? DefaultPaymentTermsDays { get; set; }

    public string? DefaultInvoiceNotes { get; set; }

    public string? DefaultTermsAndConditions { get; set; }

    public Guid? DefaultTemplateId { get; set; }

    public string? LogoUrl { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }
}
