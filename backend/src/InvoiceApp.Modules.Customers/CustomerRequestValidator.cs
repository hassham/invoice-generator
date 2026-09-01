using System.Text.RegularExpressions;
using InvoiceApp.Application.Customers;
using InvoiceApp.Application.Exceptions;

namespace InvoiceApp.Modules.Customers;

/// <summary>
/// FSD section 56 defines a single required "Customer Name" field, but docs/DATABASE_SCHEMA.md
/// (and the Customer entity it drives) has no such column - only nullable BusinessName and
/// ContactName, per the FSD-vs-DB mismatch flagged during IG-193. Resolved here the same way that
/// Story flagged it should be: "the customer name" is satisfied by whichever of the two identifies
/// them, so at least one of the two must be non-blank.
/// </summary>
public static class CustomerRequestValidator
{
    private static readonly Regex EmailPattern = new(@"^[^\s@]+@[^\s@]+\.[^\s@]+$", RegexOptions.Compiled);

    public static void Validate(CustomerRequest request)
    {
        var errors = new List<string>();

        if (string.IsNullOrWhiteSpace(request.BusinessName) && string.IsNullOrWhiteSpace(request.ContactName))
        {
            errors.Add("Customer name is required.");
        }

        if (!string.IsNullOrWhiteSpace(request.Email) && !EmailPattern.IsMatch(request.Email))
        {
            errors.Add("Email must be a valid email address.");
        }

        CheckMaxLength(request.BusinessName, 200, "Business name", errors);
        CheckMaxLength(request.ContactName, 200, "Contact name", errors);
        CheckMaxLength(request.Email, 320, "Email", errors);
        CheckMaxLength(request.Phone, 50, "Phone", errors);
        CheckMaxLength(request.AddressLine1, 200, "Address line 1", errors);
        CheckMaxLength(request.AddressLine2, 200, "Address line 2", errors);
        CheckMaxLength(request.City, 100, "City", errors);
        CheckMaxLength(request.State, 100, "State", errors);
        CheckMaxLength(request.PostalCode, 20, "Postal code", errors);
        CheckMaxLength(request.Country, 2, "Country", errors);
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
