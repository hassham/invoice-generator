using InvoiceApp.Application.Documents;
using InvoiceApp.Application.Exceptions;
using InvoiceApp.Application.Invoicing;

namespace InvoiceApp.Modules.Documents.Pdf;

/// <summary>
/// FSD section 41's whole-invoice validation, re-checked server-side since this endpoint is
/// reachable directly, not just through the invoice editor UI (same reasoning as
/// InvoiceCalculationRequestValidator, which this reuses for the numeric line-item/discount rules
/// rather than re-implementing them a third time).
/// </summary>
public static class InvoicePdfRequestValidator
{
    public static void Validate(InvoicePdfRequest request)
    {
        var errors = new List<string>();

        if (string.IsNullOrWhiteSpace(request.InvoiceNumber))
        {
            errors.Add("Invoice number is required.");
        }

        if (string.IsNullOrWhiteSpace(request.Seller))
        {
            errors.Add("From is required.");
        }

        if (string.IsNullOrWhiteSpace(request.Customer))
        {
            errors.Add("Bill To is required.");
        }

        if (request.DueDate < request.IssueDate)
        {
            errors.Add("Due date cannot be earlier than the issue date.");
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

        // Delegates the shared numeric checks (item count, quantity/unit price/tax/discount
        // ranges, invoice discount range) rather than duplicating them.
        InvoiceCalculationRequestValidator.Validate(new InvoiceCalculationRequest(
            request.Items
                .Select(item => new InvoiceLineItemCalculationInput(item.Quantity, item.UnitPrice, item.TaxRate, item.Discount))
                .ToList(),
            request.InvoiceDiscountType,
            request.InvoiceDiscountValue,
            request.TaxCalculationMethod));
    }
}
