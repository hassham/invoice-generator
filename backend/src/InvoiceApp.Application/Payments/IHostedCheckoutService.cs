using InvoiceApp.Application.Invoicing;

namespace InvoiceApp.Application.Payments;

/// <summary>
/// IG-216: anonymous, token-keyed orchestration for paying a hosted invoice online - separate from
/// IInvoiceService (invoice CRUD) and IPaymentService (authenticated manual payment recording,
/// account-owned only), since this needs neither a userId nor an authenticated session, matching
/// IInvoiceService.GetHostedInvoiceAsync's own precedent.
/// </summary>
public interface IHostedCheckoutService
{
    /// <summary>Throws ConflictException if the invoice is Cancelled, already fully paid, or its
    /// business has no Stripe account connected - mirrors PaymentService.RecordAsync's own guard
    /// against adding payments to a Cancelled invoice.</summary>
    Task<CheckoutSessionDto> CreateSessionAsync(string token, string successUrl, string cancelUrl, CancellationToken cancellationToken);

    /// <summary>Verifies the session server-side with Stripe before recording anything - see
    /// IStripeCheckoutService.GetSessionStatusAsync's own doc comment. Idempotent: confirming the
    /// same session id twice (e.g. the customer reloading the redirect-back page) records the
    /// payment only once.</summary>
    Task<CheckoutConfirmationDto> ConfirmSessionAsync(string token, string sessionId, CancellationToken cancellationToken);

    /// <summary>IG-217: reconciles a payment from an already signature-verified Stripe webhook
    /// event (IStripeWebhookService's own job, not this method's) - the real safety net for a
    /// customer who pays but closes the tab before Checkout's redirect-back ever runs
    /// ConfirmSessionAsync. Shares the same idempotent record-payment logic, so whichever of the
    /// two paths arrives first records the payment and the other becomes a no-op.</summary>
    Task HandleWebhookPaymentAsync(string publicToken, string sessionId, decimal? amountTotal, bool isPaid, CancellationToken cancellationToken);
}

public sealed record CheckoutSessionDto(string Url);

public sealed record CheckoutConfirmationDto(bool Paid, HostedInvoiceDto Invoice);
