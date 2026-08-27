using InvoiceApp.Application.Exceptions;
using InvoiceApp.Domain.Invoicing;

namespace InvoiceApp.Application.Invoicing;

/// <summary>
/// Server-side re-check of the same numeric-range rules the frontend already enforces
/// (frontend/app/invoice/create/lib/lineItems.ts) - defence in depth, since this endpoint is
/// reachable directly, not just through the invoice editor UI.
///
/// Lives in Application (beside InvoiceCalculator and its own DTOs) rather than the Invoicing
/// module so it can be reused by other modules without a prohibited module-to-module reference
/// (IG-43 needed it from InvoiceApp.Modules.Documents) - see ModuleReferenceBoundaryTests.
/// </summary>
public static class InvoiceCalculationRequestValidator
{
    public static void Validate(InvoiceCalculationRequest request)
    {
        var errors = new List<string>();

        if (request.Items.Count == 0)
        {
            errors.Add("At least one item is required.");
        }

        for (var i = 0; i < request.Items.Count; i++)
        {
            var item = request.Items[i];
            var position = i + 1;

            if (item.Quantity <= 0)
            {
                errors.Add($"Item {position}: quantity must be greater than 0.");
            }

            if (item.UnitPrice < 0)
            {
                errors.Add($"Item {position}: unit price cannot be negative.");
            }

            if (item.TaxRate < 0 || item.TaxRate > 100)
            {
                errors.Add($"Item {position}: tax rate must be between 0 and 100.");
            }

            if (item.Discount < 0)
            {
                errors.Add($"Item {position}: discount cannot be negative.");
            }
            else if (item.Discount > item.Quantity * item.UnitPrice)
            {
                errors.Add($"Item {position}: discount cannot exceed the line amount.");
            }
        }

        if (request.InvoiceDiscountType != DiscountType.None)
        {
            if (request.InvoiceDiscountValue is not { } value || value < 0)
            {
                errors.Add("Invoice discount value must be provided and cannot be negative.");
            }
            else if (request.InvoiceDiscountType == DiscountType.Percentage && value > 100)
            {
                errors.Add("Invoice discount percentage must be between 0 and 100.");
            }
        }

        if (errors.Count > 0)
        {
            throw new ValidationException(string.Join(" ", errors));
        }
    }
}
