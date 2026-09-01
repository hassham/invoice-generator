using InvoiceApp.Domain.Businesses;

namespace InvoiceApp.Application.Businesses;

/// <summary>FSD sections 62/63: the Business entity already has every column this Story needs
/// (created day one, never exposed via any endpoint until now). Excludes InvoicePrefix/
/// NextInvoiceNumber/InvoiceNumberPadding (IG-54's own scope) and LogoUrl (no server-side file
/// storage exists anywhere in this app - the same documented gap IG-42 flagged).</summary>
public sealed record BusinessProfileDto(
    Guid Id,
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
    Guid? DefaultTemplateId,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);
