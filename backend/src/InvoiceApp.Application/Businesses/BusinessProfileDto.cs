using InvoiceApp.Domain.Businesses;

namespace InvoiceApp.Application.Businesses;

/// <summary>FSD sections 62/63/64: the Business entity already has every column this Story needs
/// (created day one, never exposed via any endpoint until now). LogoUrl was excluded here until
/// IG-52 added real server-side file storage (IBusinessLogoStorage) - it's a relative path served
/// by GET /api/v1/business/logo/{businessId}, not raw image data, so it fits comfortably within
/// the column's varchar(500).</summary>
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
    // IG-54 / FSD section 64.
    string InvoicePrefix,
    int NextInvoiceNumber,
    int InvoiceNumberPadding,
    // IG-52 / FSD section 14.
    string? LogoUrl,
    // IG-219: null means no Stripe account connected - the frontend uses this (not a separate
    // boolean) both to render Connect-vs-Connected state and, per IG-219's own AC, to decide
    // whether the hosted invoice page's Pay Now button is shown at all.
    string? StripeAccountId,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);
