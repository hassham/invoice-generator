using InvoiceApp.Application.Catalog;
using InvoiceApp.Application.Exceptions;

namespace InvoiceApp.Modules.Catalog;

/// <summary>FSD section 60: Name and Unit Price are the only required fields; Description, SKU,
/// Unit and Tax Rate are optional. Max lengths mirror docs/DATABASE_SCHEMA.md's catalog.items
/// columns (CatalogItemConfiguration) exactly.</summary>
public static class CatalogItemRequestValidator
{
    public static void Validate(CatalogItemRequest request)
    {
        var errors = new List<string>();

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            errors.Add("Name is required.");
        }

        if (request.UnitPrice < 0)
        {
            errors.Add("Unit price cannot be negative.");
        }

        // Same 0-100 bound as InvoiceCalculationRequestValidator's line-item tax rate - a
        // catalogue item's tax rate feeds directly into that same calculation once selected on an
        // invoice (FSD section 25), so it can't be a value the calculator would itself reject.
        if (request.TaxRate is < 0 or > 100)
        {
            errors.Add("Tax rate must be between 0 and 100.");
        }

        // Description has no HasMaxLength in CatalogItemConfiguration (an unbounded text column,
        // same as Customer.Notes) - no length check here for the same reason CustomerRequestValidator
        // has none for Notes.
        CheckMaxLength(request.Name, 200, "Name", errors);
        CheckMaxLength(request.SKU, 100, "SKU", errors);
        CheckMaxLength(request.Unit, 50, "Unit", errors);

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
