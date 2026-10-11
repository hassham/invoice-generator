using InvoiceApp.Domain.Businesses;

namespace InvoiceApp.Application.Businesses;

/// <summary>IG-295: request to create a new business under an account. Only the essential
/// fields are required; others default to what was set during onboarding or system defaults.</summary>
public sealed record CreateBusinessRequest(
    string BusinessName,
    string Country,
    string DefaultCurrency,
    TaxCalculationMethod TaxCalculationMethod = TaxCalculationMethod.Exclusive,
    decimal DefaultTaxRate = 0m,
    PaymentTermsOption DefaultPaymentTerms = PaymentTermsOption.DueOnReceipt,
    int? DefaultPaymentTermsDays = null,
    string InvoicePrefix = "INV-",
    int InvoiceNumberPadding = 4,
    string EstimatePrefix = "EST-",
    int EstimateNumberPadding = 4);
