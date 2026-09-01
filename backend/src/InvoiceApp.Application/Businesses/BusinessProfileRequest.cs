using InvoiceApp.Domain.Businesses;

namespace InvoiceApp.Application.Businesses;

/// <summary>There's exactly one Business row per account (created at registration) - a PUT
/// updates it in place, there's no create/delete for this Story.</summary>
public sealed record BusinessProfileRequest(
    string BusinessName,
    string? LegalName,
    string? Email,
    string? Phone,
    string? Website,
    string? AddressLine1,
    string? AddressLine2,
    string? City,
    string? State,
    string? PostalCode,
    string Country,
    string? RegistrationNumber,
    string? TaxNumber,
    string DefaultCurrency,
    decimal DefaultTaxRate,
    TaxCalculationMethod TaxCalculationMethod,
    PaymentTermsOption DefaultPaymentTerms,
    int? DefaultPaymentTermsDays,
    string? DefaultInvoiceNotes,
    string? DefaultTermsAndConditions,
    Guid? DefaultTemplateId);
