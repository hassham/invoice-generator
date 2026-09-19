using InvoiceApp.Application.Payments;

namespace InvoiceApp.Api.Endpoints;

/// <summary>
/// IG-217: receives Stripe's Connect webhook events (one URL, configured in the Stripe Dashboard
/// against every connected account, per StripeOptions.ConnectWebhookSecret's own doc comment).
/// Deliberately not rate-limited like every other anonymous endpoint in this app - Stripe's
/// webhook-delivery IPs are shared infrastructure across many unrelated Stripe integrations, so an
/// IP-keyed limit here risks dropping legitimate deliveries; the HMAC signature check
/// (IStripeWebhookService) is this endpoint's actual access control, not IP throttling.
/// </summary>
public static class StripeWebhookEndpoints
{
    public static IEndpointRouteBuilder MapStripeWebhookEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/v1/webhooks/stripe", HandleAsync);
        return app;
    }

    private static async Task<IResult> HandleAsync(
        HttpContext context,
        IStripeWebhookService webhookService,
        IHostedCheckoutService hostedCheckoutService,
        CancellationToken cancellationToken)
    {
        using var reader = new StreamReader(context.Request.Body);
        var payload = await reader.ReadToEndAsync(cancellationToken);
        var signature = context.Request.Headers["Stripe-Signature"].ToString();

        var result = webhookService.ParseEvent(payload, signature);
        if (!result.IsValid)
        {
            return Results.BadRequest();
        }

        if (result.SessionId is not null && result.PublicTokenMetadata is not null)
        {
            await hostedCheckoutService.HandleWebhookPaymentAsync(result.PublicTokenMetadata, result.SessionId, result.AmountTotal, result.IsPaid, cancellationToken);
        }

        return Results.Ok();
    }
}
