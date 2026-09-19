using InvoiceApp.Application.Estimates;
using InvoiceApp.Application.Exceptions;
using InvoiceApp.Application.Invoicing;

namespace InvoiceApp.Modules.Invoicing;

/// <summary>
/// IG-220: lives alongside InvoiceSaveRequestValidator (not a new InvoiceApp.Modules.Estimates
/// project) - this project already references exactly what's needed (Application + Domain), and
/// InvoiceApp.ArchitectureTests.ModuleReferenceBoundaryTests enumerates allowed project references
/// by literal name, so a new project would need its own entry there for no real benefit over
/// reusing this one. Same server-side re-check reasoning as InvoiceSaveRequestValidator - this
/// endpoint is reachable directly, not just through the estimate editor UI.
/// </summary>
public static class EstimateSaveRequestValidator
{
    public static void Validate(EstimateSaveRequest request)
    {
        var errors = new List<string>();

        if (string.IsNullOrWhiteSpace(request.EstimateNumber))
        {
            errors.Add("Estimate number is required.");
        }
        else if (request.EstimateNumber.Length > 50)
        {
            errors.Add("Estimate number must be 50 characters or fewer.");
        }

        if (request.IssueDate == default)
        {
            errors.Add("Issue date is required.");
        }

        if (request.ExpiryDate == default)
        {
            errors.Add("Expiry date is required.");
        }

        if (request.IssueDate != default && request.ExpiryDate != default && request.ExpiryDate < request.IssueDate)
        {
            errors.Add("Expiry date cannot be earlier than the issue date.");
        }

        if (string.IsNullOrWhiteSpace(request.Currency) || request.Currency.Trim().Length != 3)
        {
            errors.Add("Currency must be a 3-letter code.");
        }

        if (string.IsNullOrWhiteSpace(request.Seller))
        {
            errors.Add("From is required.");
        }

        if (string.IsNullOrWhiteSpace(request.Customer))
        {
            errors.Add("Bill To is required.");
        }

        for (var i = 0; i < request.Items.Count; i++)
        {
            if (string.IsNullOrWhiteSpace(request.Items[i].Description))
            {
                errors.Add($"Item {i + 1}: description is required.");
            }
        }

        if (errors.Count > 0)
        {
            throw new ValidationException(string.Join(" ", errors));
        }

        InvoiceCalculationRequestValidator.Validate(new InvoiceCalculationRequest(
            request.Items
                .Select(item => new InvoiceLineItemCalculationInput(item.Quantity, item.UnitPrice, item.TaxRate, item.Discount))
                .ToList(),
            request.DiscountType,
            request.DiscountValue,
            request.TaxCalculationMethod));
    }
}
