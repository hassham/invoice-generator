using InvoiceApp.Application.Audit;
using InvoiceApp.Application.Exceptions;
using InvoiceApp.Application.Invoicing;
using InvoiceApp.Application.Payments;
using InvoiceApp.Domain.Businesses;
using InvoiceApp.Domain.Invoicing;
using InvoiceApp.Domain.Payments;
using InvoiceApp.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace InvoiceApp.Infrastructure.Payments;

/// <summary>
/// IG-216: touches Invoice, Business and Payment directly via dbContext from within the Payments
/// module, same cross-entity precedent PaymentService.RecordAsync already established (loads and
/// updates Invoice despite living in Payments, not Invoicing).
/// </summary>
public sealed class HostedCheckoutService(ApplicationDbContext dbContext, IStripeCheckoutService stripeCheckoutService, IAuditLogService auditLogService) : IHostedCheckoutService
{
    public async Task<CheckoutSessionDto> CreateSessionAsync(string token, string successUrl, string cancelUrl, CancellationToken cancellationToken)
    {
        var invoice = await LoadByPublicTokenAsync(token, cancellationToken);
        var business = await dbContext.Businesses.SingleAsync(b => b.Id == invoice.BusinessId, cancellationToken);

        if (business.StripeAccountId is not { } stripeAccountId)
        {
            throw new ConflictException("Online payment is not available for this invoice.");
        }

        // Same guard PaymentService.RecordAsync applies to a manually-recorded payment - a
        // Cancelled invoice never accepts a new payment, and a fully-paid one has nothing left to
        // charge for.
        if (invoice.Status == InvoiceStatus.Cancelled)
        {
            throw new ConflictException("This invoice has been cancelled and cannot be paid.");
        }

        if (invoice.AmountDue <= 0)
        {
            throw new ConflictException("This invoice has already been paid in full.");
        }

        var result = await stripeCheckoutService.CreateSessionAsync(
            new StripeCheckoutSessionRequest(
                stripeAccountId,
                invoice.Id,
                token,
                invoice.InvoiceNumber,
                invoice.Currency,
                invoice.AmountDue,
                successUrl,
                cancelUrl),
            cancellationToken);

        return new CheckoutSessionDto(result.Url);
    }

    public async Task<CheckoutConfirmationDto> ConfirmSessionAsync(string token, string sessionId, CancellationToken cancellationToken)
    {
        var invoice = await LoadByPublicTokenAsync(token, cancellationToken);
        var business = await dbContext.Businesses.SingleAsync(b => b.Id == invoice.BusinessId, cancellationToken);

        if (business.StripeAccountId is not { } stripeAccountId)
        {
            throw new ConflictException("Online payment is not available for this invoice.");
        }

        // Idempotent: a customer reloading the post-payment redirect must never record the same
        // Stripe payment twice - checked before calling Stripe at all, so a repeat confirmation is
        // just a cache hit against this invoice's own payment history.
        var alreadyRecorded = await dbContext.Payments.AnyAsync(p => p.StripeCheckoutSessionId == sessionId, cancellationToken);
        if (alreadyRecorded)
        {
            return new CheckoutConfirmationDto(true, ToHostedDto(invoice, business));
        }

        var status = await stripeCheckoutService.GetSessionStatusAsync(stripeAccountId, sessionId, cancellationToken);

        // The session must be both genuinely paid and bound to this exact invoice (metadata set at
        // creation - IStripeCheckoutService's own doc comment) - a session id for a different
        // invoice, even under the same connected account, must never confirm this one.
        if (!status.IsPaid || status.PublicTokenMetadata != token)
        {
            return new CheckoutConfirmationDto(false, ToHostedDto(invoice, business));
        }

        // Clamped to the invoice's own outstanding balance, not trusted verbatim from Stripe - the
        // balance could have shifted (e.g. a manual payment recorded concurrently) between Checkout
        // session creation and this confirmation, and this must never push AmountDue negative,
        // mirroring PaymentService.RecordAsync's own overpayment invariant.
        var amount = Math.Min(status.AmountTotal ?? invoice.AmountDue, invoice.AmountDue);

        var payment = new Payment
        {
            Id = Guid.NewGuid(),
            InvoiceId = invoice.Id,
            PaymentDate = DateOnly.FromDateTime(DateTimeOffset.UtcNow.Date),
            Amount = amount,
            PaymentMethod = PaymentMethod.Card,
            Reference = null,
            Notes = null,
            CreatedAt = DateTimeOffset.UtcNow,
            CreatedBy = null,
            StripeCheckoutSessionId = sessionId,
        };
        dbContext.Payments.Add(payment);

        invoice.AmountPaid += amount;
        invoice.AmountDue = invoice.TotalAmount - invoice.AmountPaid;
        invoice.Status = invoice.AmountDue <= 0 ? InvoiceStatus.Paid : InvoiceStatus.PartiallyPaid;
        invoice.UpdatedAt = DateTimeOffset.UtcNow;

        await auditLogService.RecordAsync(
            null,
            invoice.BusinessId,
            "Payment",
            payment.Id,
            "Payment received via Stripe Checkout",
            new { invoice.InvoiceNumber, payment.Amount },
            cancellationToken);

        await dbContext.SaveChangesAsync(cancellationToken);

        return new CheckoutConfirmationDto(true, ToHostedDto(invoice, business));
    }

    private async Task<Invoice> LoadByPublicTokenAsync(string token, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            throw new NotFoundException("Invoice not found.");
        }

        var invoice = await dbContext.Invoices.SingleOrDefaultAsync(i => i.PublicToken == token && !i.IsDeleted, cancellationToken);
        return invoice ?? throw new NotFoundException("Invoice not found.");
    }

    private static HostedInvoiceDto ToHostedDto(Invoice invoice, Business business) => new(
        business.BusinessName,
        business.LogoUrl,
        invoice.InvoiceNumber,
        InvoiceStatusRules.DetermineEffectiveStatus(invoice.Status, invoice.DueDate, invoice.AmountDue, DateOnly.FromDateTime(DateTimeOffset.UtcNow.Date)),
        invoice.IssueDate,
        invoice.DueDate,
        invoice.Currency,
        invoice.TotalAmount,
        invoice.AmountDue,
        true);
}
