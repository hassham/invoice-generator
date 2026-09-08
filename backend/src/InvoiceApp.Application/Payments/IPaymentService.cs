using InvoiceApp.Application.Invoicing;

namespace InvoiceApp.Application.Payments;

public sealed record PaymentRecordResult(PaymentDto Payment, InvoiceDto Invoice);

/// <summary>
/// Every method resolves account ownership from <paramref name="userId"/> and the invoice's own
/// BusinessId internally, never a caller-supplied business id - same precedent as
/// ICustomerService/ICatalogItemService (S52 AC: "cross-account ... payments are rejected").
/// </summary>
public interface IPaymentService
{
    Task<IReadOnlyList<PaymentDto>> ListAsync(Guid userId, Guid invoiceId, CancellationToken cancellationToken);

    /// <summary>FSD sections 69/70/71: validates the amount against the invoice's current
    /// outstanding balance, rejects a Cancelled invoice (no reactivation flow exists to build
    /// against), then recalculates AmountPaid/AmountDue/Status atomically with the new payment
    /// row.</summary>
    Task<PaymentRecordResult> RecordAsync(Guid userId, Guid invoiceId, PaymentRequest request, CancellationToken cancellationToken);

    /// <summary>FSD section 72: allowed regardless of the invoice's current status - removing an
    /// existing payment is a correction, not a new payment, so it isn't blocked by the same
    /// Cancelled-invoice rule RecordAsync enforces. Recalculates AmountPaid/AmountDue/Status
    /// (unless the invoice is Cancelled, whose stored Status is never overwritten by payment
    /// changes) and returns the updated invoice.</summary>
    Task<InvoiceDto> RemoveAsync(Guid userId, Guid invoiceId, Guid paymentId, CancellationToken cancellationToken);
}
