using InvoiceApp.Application.Businesses;
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
        business.UpdatedAt = DateTimeOffset.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

        return ToDto(business);
    }

    private async Task<Business> FindOwnedAsync(Guid userId, CancellationToken cancellationToken) =>
        await dbContext.Businesses.SingleAsync(business => business.UserId == userId, cancellationToken);

    private static string? NullIfEmpty(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

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
        business.CreatedAt,
        business.UpdatedAt);
}
