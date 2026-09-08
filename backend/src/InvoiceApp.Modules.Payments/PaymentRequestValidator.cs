using InvoiceApp.Application.Exceptions;
using InvoiceApp.Application.Payments;

namespace InvoiceApp.Modules.Payments;

/// <summary>FSD section 70: amount must be greater than zero. The other half of that rule -
/// rejecting an amount that exceeds the invoice's outstanding balance - needs the loaded invoice's
/// current AmountDue, which this pure request-shape validator (called from the endpoint layer,
/// same convention as CatalogItemRequestValidator/CustomerRequestValidator) doesn't have; that
/// check lives in PaymentService.RecordAsync instead, alongside its other invoice-state business
/// rules (mirroring how InvoiceService checks invoice-number uniqueness inline rather than via a
/// static validator). Reference's max length mirrors docs/DATABASE_SCHEMA.md's payment.payments
/// column (PaymentConfiguration) exactly; Notes has no configured max length there, so none is
/// checked here either, same reasoning as CatalogItemRequestValidator's Description.</summary>
public static class PaymentRequestValidator
{
    public static void Validate(PaymentRequest request)
    {
        var errors = new List<string>();

        if (request.Amount <= 0)
        {
            errors.Add("Amount must be greater than zero.");
        }

        if (request.Reference is { Length: > 200 })
        {
            errors.Add("Reference must be 200 characters or fewer.");
        }

        if (errors.Count > 0)
        {
            throw new ValidationException(string.Join(" ", errors));
        }
    }
}
