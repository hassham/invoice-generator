using InvoiceApp.Application.Payments;
using InvoiceApp.Infrastructure.Configuration;
using Microsoft.Extensions.Options;
using Stripe;
using Stripe.Checkout;

namespace InvoiceApp.Infrastructure.Payments;

/// <summary>
/// IG-217: only this class (and StripeCheckoutService/StripeConnectService) reference the
/// Stripe.net SDK directly - see IStripeWebhookService's own doc comment.
/// </summary>
public sealed class StripeWebhookService(IOptions<StripeOptions> stripeOptions) : IStripeWebhookService
{
    private readonly StripeOptions options = stripeOptions.Value;

    private static readonly HashSet<string> RelevantEventTypes = ["checkout.session.completed", "checkout.session.async_payment_succeeded"];

    public StripeWebhookParseResult ParseEvent(string payload, string signatureHeader)
    {
        Event stripeEvent;
        try
        {
            // throwOnApiVersionMismatch: false - Stripe's account-level API version and this SDK's
            // pinned version drift independently over time; rejecting a genuinely-signed event over
            // a version mismatch would silently lose real payments rather than just risk a shape
            // this code doesn't expect (guarded by the type/cast checks below regardless).
            stripeEvent = EventUtility.ConstructEvent(payload, signatureHeader, options.ConnectWebhookSecret, throwOnApiVersionMismatch: false);
        }
        catch (StripeException)
        {
            return new StripeWebhookParseResult(false, null, null, false, null);
        }

        if (!RelevantEventTypes.Contains(stripeEvent.Type) || stripeEvent.Data.Object is not Session session)
        {
            // Validly signed, just not an event this app acts on - the caller should still ack
            // with 200 (IsValid true) so Stripe doesn't retry it forever.
            return new StripeWebhookParseResult(true, null, null, false, null);
        }

        var publicToken = session.Metadata is not null && session.Metadata.TryGetValue("publicToken", out var token) ? token : null;
        var amountTotal = session.AmountTotal.HasValue ? StripeAmountConverter.FromSmallestUnit(session.AmountTotal.Value, session.Currency) : (decimal?)null;

        return new StripeWebhookParseResult(true, session.Id, publicToken, session.PaymentStatus == "paid", amountTotal);
    }
}
