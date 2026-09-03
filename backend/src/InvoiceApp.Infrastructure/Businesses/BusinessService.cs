using InvoiceApp.Application.Businesses;
using InvoiceApp.Application.Exceptions;
using InvoiceApp.Domain.Businesses;
using InvoiceApp.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace InvoiceApp.Infrastructure.Businesses;

public sealed class BusinessService(ApplicationDbContext dbContext) : IBusinessService
{
    public async Task<BusinessProfileDto> GetAsync(Guid userId, CancellationToken cancellationToken)
    {
        var business = await FindOwnedAsync(userId, cancellationToken);
        return ToDto(business);
    }

    public async Task<BusinessProfileDto> UpdateAsync(Guid userId, BusinessProfileRequest request, CancellationToken cancellationToken)
    {
        var business = await FindOwnedAsync(userId, cancellationToken);

        // IG-54 AC: "conflicting settings are rejected clearly" - a config change that would make
        // the *next* generated number collide with one that already exists for this business is
        // rejected outright, not silently left to surface as a save-time conflict much later.
        var trimmedPrefix = request.InvoicePrefix.Trim();
        var nextFormatted = FormatInvoiceNumber(trimmedPrefix, request.NextInvoiceNumber, request.InvoiceNumberPadding);
        var numberAlreadyExists = await dbContext.Invoices.AnyAsync(
            invoice => invoice.BusinessId == business.Id && invoice.InvoiceNumber == nextFormatted && !invoice.IsDeleted,
            cancellationToken);
        if (numberAlreadyExists)
        {
            throw new ConflictException($"An invoice numbered \"{nextFormatted}\" already exists - choose a different prefix or next number.");
        }

        business.BusinessName = request.BusinessName.Trim();
        business.LegalName = NullIfEmpty(request.LegalName);
        business.Email = NullIfEmpty(request.Email);
        business.Phone = NullIfEmpty(request.Phone);
        business.Website = NullIfEmpty(request.Website);
        business.AddressLine1 = NullIfEmpty(request.AddressLine1);
        business.AddressLine2 = NullIfEmpty(request.AddressLine2);
        business.City = NullIfEmpty(request.City);
        business.State = NullIfEmpty(request.State);
        business.PostalCode = NullIfEmpty(request.PostalCode);
        business.Country = request.Country.Trim().ToUpperInvariant();
        business.RegistrationNumber = NullIfEmpty(request.RegistrationNumber);
        business.TaxNumber = NullIfEmpty(request.TaxNumber);
        business.DefaultCurrency = request.DefaultCurrency.Trim().ToUpperInvariant();
        business.DefaultTaxRate = request.DefaultTaxRate;
        business.TaxCalculationMethod = request.TaxCalculationMethod;
        business.DefaultPaymentTerms = request.DefaultPaymentTerms;
        // "used when default_payment_terms = Custom" (docs/DATABASE_SCHEMA.md) - cleared for
        // every other option so a stale day count can't linger from a prior Custom selection.
        business.DefaultPaymentTermsDays = request.DefaultPaymentTerms == PaymentTermsOption.Custom ? request.DefaultPaymentTermsDays : null;
        business.DefaultInvoiceNotes = NullIfEmpty(request.DefaultInvoiceNotes);
        business.DefaultTermsAndConditions = NullIfEmpty(request.DefaultTermsAndConditions);
        business.DefaultTemplateId = request.DefaultTemplateId;
        business.InvoicePrefix = trimmedPrefix;
        business.NextInvoiceNumber = request.NextInvoiceNumber;
        business.InvoiceNumberPadding = request.InvoiceNumberPadding;
        business.UpdatedAt = DateTimeOffset.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

        return ToDto(business);
    }

    public async Task<GeneratedInvoiceNumberDto> GenerateNextInvoiceNumberAsync(Guid userId, CancellationToken cancellationToken)
    {
        var business = await FindOwnedAsync(userId, cancellationToken);

        var formatted = FormatInvoiceNumber(business.InvoicePrefix, business.NextInvoiceNumber, business.InvoiceNumberPadding);
        // Not hardened against a genuine concurrent-request race (two simultaneous calls both
        // reading NextInvoiceNumber before either writes) - that's IG-46's own AC, not this
        // Story's, same scoping precedent InvoiceService.SaveAsync's own uniqueness check already
        // set. A collision with a manually-typed number still gets caught by that same check when
        // the invoice is actually saved.
        business.NextInvoiceNumber += 1;
        business.UpdatedAt = DateTimeOffset.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

        return new GeneratedInvoiceNumberDto(formatted);
    }

    private async Task<Business> FindOwnedAsync(Guid userId, CancellationToken cancellationToken) =>
        await dbContext.Businesses.SingleAsync(business => business.UserId == userId, cancellationToken);

    private static string? NullIfEmpty(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    /// <summary>FSD section 64: prefix + next number zero-padded to the configured width (e.g.
    /// "INV-" + 1001 padded to 4 -> "INV-1001").</summary>
    private static string FormatInvoiceNumber(string prefix, int nextNumber, int padding) =>
        $"{prefix}{nextNumber.ToString().PadLeft(padding, '0')}";

    private static BusinessProfileDto ToDto(Business business) => new(
        business.Id,
        business.BusinessName,
        business.LegalName,
        business.Email,
        business.Phone,
        business.Website,
        business.AddressLine1,
        business.AddressLine2,
        business.City,
        business.State,
        business.PostalCode,
        business.Country,
        business.RegistrationNumber,
        business.TaxNumber,
        business.DefaultCurrency,
        business.DefaultTaxRate,
        business.TaxCalculationMethod,
        business.DefaultPaymentTerms,
        business.DefaultPaymentTermsDays,
        business.DefaultInvoiceNotes,
        business.DefaultTermsAndConditions,
        business.DefaultTemplateId,
        business.InvoicePrefix,
        business.NextInvoiceNumber,
        business.InvoiceNumberPadding,
        business.CreatedAt,
        business.UpdatedAt);
}
