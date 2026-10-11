using InvoiceApp.Application.Audit;
using InvoiceApp.Application.Exceptions;
using InvoiceApp.Application.Invoicing;
using InvoiceApp.Application.Payments;
using InvoiceApp.Domain.Invoicing;
using InvoiceApp.Domain.Payments;
using InvoiceApp.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace InvoiceApp.Infrastructure.Payments;

public sealed class PaymentService(ApplicationDbContext dbContext, IAuditLogService auditLogService) : IPaymentService
{
    public async Task<IReadOnlyList<PaymentDto>> ListAsync(Guid userId, Guid businessId, Guid invoiceId, CancellationToken cancellationToken)
    {
        var invoice = await LoadOwnedInvoiceAsync(userId, businessId, invoiceId, cancellationToken);

        var payments = await dbContext.Payments
            .Where(payment => payment.InvoiceId == invoice.Id)
            .OrderByDescending(payment => payment.PaymentDate)
            .ThenByDescending(payment => payment.CreatedAt)
            .ToListAsync(cancellationToken);

        return payments.Select(ToDto).ToList();
    }

    public async Task<PaymentRecordResult> RecordAsync(Guid userId, Guid businessId, Guid invoiceId, PaymentRequest request, CancellationToken cancellationToken)
    {
        var invoice = await LoadOwnedInvoiceAsync(userId, businessId, invoiceId, cancellationToken);

        // FSD section 52: no reactivation flow exists to build against, so this is a hard block on
        // *recording new* payments - removing one (RemoveAsync) is a correction and stays allowed.
        if (invoice.Status == InvoiceStatus.Cancelled)
        {
            throw new ConflictException("Payments cannot be added to a cancelled invoice.");
        }

        // FSD section 70: the amount-shape check (>0) already ran in PaymentRequestValidator at
        // the endpoint layer; the other half - rejecting overpayment - needs the invoice's current
        // balance, which only exists here. MVP explicitly rejects overpayment outright rather than
        // supporting a partial-overpayment credit.
        if (request.Amount > invoice.AmountDue)
        {
            throw new ValidationException($"Amount cannot exceed the outstanding balance of {invoice.AmountDue:0.00}.");
        }

        var payment = new Payment
        {
            Id = Guid.NewGuid(),
            InvoiceId = invoice.Id,
            PaymentDate = request.PaymentDate,
            Amount = request.Amount,
            PaymentMethod = request.PaymentMethod,
            Reference = NullIfEmpty(request.Reference),
            Notes = NullIfEmpty(request.Notes),
            CreatedAt = DateTimeOffset.UtcNow,
            CreatedBy = userId,
        };
        dbContext.Payments.Add(payment);

        invoice.AmountPaid += payment.Amount;
        invoice.AmountDue = invoice.TotalAmount - invoice.AmountPaid;
        // FSD section 71: 0 < AmountPaid < Total -> PartiallyPaid, AmountPaid == Total -> Paid.
        // AmountPaid can't be <= 0 here - Amount was just validated to be > 0.
        invoice.Status = invoice.AmountDue <= 0 ? InvoiceStatus.Paid : InvoiceStatus.PartiallyPaid;
        invoice.UpdatedAt = DateTimeOffset.UtcNow;

        await auditLogService.RecordAsync(
            userId,
            invoice.BusinessId,
            "Payment",
            payment.Id,
            "Payment recorded",
            new { invoice.InvoiceNumber, payment.Amount, payment.PaymentMethod },
            cancellationToken);

        await dbContext.SaveChangesAsync(cancellationToken);

        return new PaymentRecordResult(ToDto(payment), ToInvoiceDto(invoice));
    }

    public async Task<InvoiceDto> RemoveAsync(Guid userId, Guid businessId, Guid invoiceId, Guid paymentId, CancellationToken cancellationToken)
    {
        var invoice = await LoadOwnedInvoiceAsync(userId, businessId, invoiceId, cancellationToken);

        var payment = await dbContext.Payments.SingleOrDefaultAsync(
            p => p.Id == paymentId && p.InvoiceId == invoice.Id,
            cancellationToken)
            ?? throw new NotFoundException("Payment not found.");

        dbContext.Payments.Remove(payment);

        invoice.AmountPaid -= payment.Amount;
        invoice.AmountDue = invoice.TotalAmount - invoice.AmountPaid;
        // FSD section 72: a Cancelled invoice's stored Status is never overwritten by payment
        // changes - removal still updates the balance figures (it's a factual correction) but
        // leaves Status alone. Otherwise: AmountPaid back to 0 reverts to the only reachable
        // pre-payment status in this codebase today (Draft - Sent/Viewed are never assigned
        // anywhere, see IPaymentService's own remarks); partial remainder is PartiallyPaid.
        if (invoice.Status != InvoiceStatus.Cancelled)
        {
            invoice.Status = invoice.AmountPaid <= 0
                ? InvoiceStatus.Draft
                : invoice.AmountDue <= 0 ? InvoiceStatus.Paid : InvoiceStatus.PartiallyPaid;
        }
        invoice.UpdatedAt = DateTimeOffset.UtcNow;

        await auditLogService.RecordAsync(
            userId,
            invoice.BusinessId,
            "Payment",
            payment.Id,
            "Payment removed",
            new { invoice.InvoiceNumber, payment.Amount, payment.PaymentMethod },
            cancellationToken);

        await dbContext.SaveChangesAsync(cancellationToken);

        return ToInvoiceDto(invoice);
    }

    /// <summary>IG-296: the invoice must sit under the business the request names, and that business
    /// must belong to the caller. Anything else is reported as not found, with no hint which part failed.</summary>
    private async Task<Invoice> LoadOwnedInvoiceAsync(Guid userId, Guid businessId, Guid invoiceId, CancellationToken cancellationToken)
    {
        var owned = await dbContext.Businesses.AnyAsync(
            business => business.Id == businessId && business.UserId == userId,
            cancellationToken);
        if (!owned)
        {
            throw new NotFoundException("Business not found.");
        }

        return await dbContext.Invoices.SingleOrDefaultAsync(
            invoice => invoice.Id == invoiceId && invoice.BusinessId == businessId && !invoice.IsDeleted,
            cancellationToken)
            ?? throw new NotFoundException("Invoice not found.");
    }

    private static string? NullIfEmpty(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static PaymentDto ToDto(Payment payment) => new(
        payment.Id,
        payment.InvoiceId,
        payment.PaymentDate,
        payment.Amount,
        payment.PaymentMethod,
        payment.Reference,
        payment.Notes,
        payment.CreatedAt);

    private static InvoiceDto ToInvoiceDto(Invoice invoice) => new(
        invoice.Id,
        invoice.CustomerId,
        invoice.InvoiceNumber,
        // Mirrors InvoiceService.ToDto: Overdue is a computed condition never written to the
        // stored Status column (InvoiceStatusRules).
        InvoiceStatusRules.DetermineEffectiveStatus(invoice.Status, invoice.DueDate, invoice.AmountDue, DateOnly.FromDateTime(DateTimeOffset.UtcNow.Date)),
        invoice.IssueDate,
        invoice.DueDate,
        invoice.Currency,
        invoice.Reference,
        invoice.Subtotal,
        invoice.DiscountAmount,
        invoice.TaxAmount,
        invoice.TotalAmount,
        invoice.AmountPaid,
        invoice.AmountDue,
        invoice.CreatedAt,
        invoice.UpdatedAt);
}
