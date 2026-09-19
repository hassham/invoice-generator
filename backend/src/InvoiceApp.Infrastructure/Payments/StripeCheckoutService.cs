using InvoiceApp.Application.Payments;
using InvoiceApp.Infrastructure.Configuration;
using Microsoft.Extensions.Options;
using Stripe;
using Stripe.Checkout;

namespace InvoiceApp.Infrastructure.Payments;

/// <summary>
/// IG-216: a fresh StripeClient per call, same precedent as StripeConnectService (no shared/
/// injected StripeClient singleton exists in this codebase). Every session is created directly on
/// the connected account (RequestOptions.StripeAccount) - the Stripe Connect "direct charge"
/// pattern that Standard accounts use, matching StripeConnectService's own OAuth scope
/// (no application fee is computed anywhere in this codebase, so destination charges' platform-fee
/// model doesn't apply here).
/// </summary>
public sealed class StripeCheckoutService(IOptions<StripeOptions> stripeOptions) : IStripeCheckoutService
{
    private readonly StripeOptions options = stripeOptions.Value;

    public async Task<StripeCheckoutSessionResult> CreateSessionAsync(StripeCheckoutSessionRequest request, CancellationToken cancellationToken)
    {
        var client = new StripeClient(options.SecretKey);
        var service = new SessionService(client);

        var sessionOptions = new SessionCreateOptions
        {
            Mode = "payment",
            SuccessUrl = request.SuccessUrl,
            CancelUrl = request.CancelUrl,
            LineItems =
            [
                new SessionLineItemOptions
                {
                    Quantity = 1,
                    PriceData = new SessionLineItemPriceDataOptions
                    {
                        Currency = request.Currency,
                        UnitAmount = StripeAmountConverter.ToSmallestUnit(request.AmountDue, request.Currency),
                        ProductData = new SessionLineItemPriceDataProductDataOptions
                        {
                            Name = $"Invoice {request.InvoiceNumber}",
                        },
                    },
                },
            ],
            // Binds the session to this exact invoice - GetSessionStatusAsync's caller compares
            // this back against the token being confirmed, so a session created for one invoice
            // can never confirm a different one (IStripeCheckoutService's own doc comment).
            Metadata = new Dictionary<string, string>
            {
                ["invoiceId"] = request.InvoiceId.ToString(),
                ["publicToken"] = request.PublicToken,
            },
        };

        var session = await service.CreateAsync(
            sessionOptions,
            new RequestOptions { StripeAccount = request.StripeAccountId },
            cancellationToken);

        return new StripeCheckoutSessionResult(session.Id, session.Url);
    }

    public async Task<StripeCheckoutSessionStatus> GetSessionStatusAsync(string stripeAccountId, string sessionId, CancellationToken cancellationToken)
    {
        var client = new StripeClient(options.SecretKey);
        var service = new SessionService(client);

        var session = await service.GetAsync(
            sessionId,
            requestOptions: new RequestOptions { StripeAccount = stripeAccountId },
            cancellationToken: cancellationToken);

        var publicToken = session.Metadata is not null && session.Metadata.TryGetValue("publicToken", out var token) ? token : null;
        var amountTotal = session.AmountTotal.HasValue ? StripeAmountConverter.FromSmallestUnit(session.AmountTotal.Value, session.Currency) : (decimal?)null;

        return new StripeCheckoutSessionStatus(session.PaymentStatus == "paid", publicToken, amountTotal, session.CustomerDetails?.Email);
    }
}
