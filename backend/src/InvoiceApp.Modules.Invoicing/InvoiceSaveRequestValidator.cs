using InvoiceApp.Application.Exceptions;
using InvoiceApp.Application.Invoicing;

namespace InvoiceApp.Modules.Invoicing;

/// <summary>
/// Server-side re-check, same reasoning and wording as InvoicePdfRequestValidator (this endpoint
/// is reachable directly, not just through the invoice editor UI) - delegates the shared numeric
/// item/discount checks to InvoiceCalculationRequestValidator rather than duplicating them a third
/// time.
/// </summary>
public static class InvoiceSaveRequestValidator
{
    public static void Validate(InvoiceSaveRequest request)
    {
        var errors = new List<string>();

        if (string.IsNullOrWhiteSpace(request.InvoiceNumber))
        {
            errors.Add("Invoice number is required.");
        }
        else if (request.InvoiceNumber.Length > 50)
        {
            errors.Add("Invoice number must be 50 characters or fewer.");
        }

        if (request.IssueDate == default)
        {
            errors.Add("Issue date is required.");
        }

        if (request.DueDate == default)
        {
            errors.Add("Due date is required.");
        }

        if (request.IssueDate != default && request.DueDate != default && request.DueDate < request.IssueDate)
        {
            errors.Add("Due date cannot be earlier than the issue date.");
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
            request.InvoiceDiscountType,
            request.InvoiceDiscountValue,
            request.TaxCalculationMethod));
    }
}
