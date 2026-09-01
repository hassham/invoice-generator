using System.Text.RegularExpressions;
using InvoiceApp.Application.Businesses;
using InvoiceApp.Application.Exceptions;
using InvoiceApp.Domain.Businesses;

namespace InvoiceApp.Modules.Businesses;

/// <summary>Max lengths mirror docs/DATABASE_SCHEMA.md's business.businesses columns exactly.</summary>
public static class BusinessProfileRequestValidator
{
    private static readonly Regex EmailPattern = new(@"^[^\s@]+@[^\s@]+\.[^\s@]+$", RegexOptions.Compiled);

    public static void Validate(BusinessProfileRequest request)
    {
        var errors = new List<string>();

        if (string.IsNullOrWhiteSpace(request.BusinessName))
        {
            errors.Add("Business name is required.");
        }

        if (string.IsNullOrWhiteSpace(request.Country) || request.Country.Trim().Length != 2)
        {
            errors.Add("Country must be a 2-letter country code.");
        }

        if (string.IsNullOrWhiteSpace(request.DefaultCurrency) || request.DefaultCurrency.Trim().Length != 3)
        {
            errors.Add("Default currency must be a 3-letter currency code.");
        }

        if (request.DefaultTaxRate < 0)
        {
            errors.Add("Default tax rate cannot be negative.");
        }

        // "used when default_payment_terms = Custom" (docs/DATABASE_SCHEMA.md) - Custom needs an
        // explicit day count, since there's no other source for it.
        if (request.DefaultPaymentTerms == PaymentTermsOption.Custom && request.DefaultPaymentTermsDays is not (> 0))
        {
            errors.Add("Custom payment terms require a positive number of days.");
        }

        if (!string.IsNullOrWhiteSpace(request.Email) && !EmailPattern.IsMatch(request.Email))
        {
            errors.Add("Email must be a valid email address.");
        }

        CheckMaxLength(request.BusinessName, 200, "Business name", errors);
        CheckMaxLength(request.LegalName, 200, "Legal name", errors);
        CheckMaxLength(request.Email, 320, "Email", errors);
        CheckMaxLength(request.Phone, 50, "Phone", errors);
        CheckMaxLength(request.Website, 300, "Website", errors);
        CheckMaxLength(request.AddressLine1, 200, "Address line 1", errors);
        CheckMaxLength(request.AddressLine2, 200, "Address line 2", errors);
        CheckMaxLength(request.City, 100, "City", errors);
        CheckMaxLength(request.State, 100, "State", errors);
        CheckMaxLength(request.PostalCode, 20, "Postal code", errors);
        CheckMaxLength(request.RegistrationNumber, 100, "Registration number", errors);
        CheckMaxLength(request.TaxNumber, 100, "Tax number", errors);

        if (errors.Count > 0)
        {
            throw new ValidationException(string.Join(" ", errors));
        }
    }

    private static void CheckMaxLength(string? value, int maxLength, string fieldName, List<string> errors)
    {
        if (value is not null && value.Length > maxLength)
        {
            errors.Add($"{fieldName} must be {maxLength} characters or fewer.");
        }
    }
}
