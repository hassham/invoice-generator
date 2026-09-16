using InvoiceApp.Application.Invoicing;
using InvoiceApp.Application.Payments;
using InvoiceApp.Infrastructure.Configuration;
using InvoiceApp.Modules.Documents.Pdf;
using QuestPDF.Fluent;

namespace InvoiceApp.Api.Endpoints;

/// <summary>
/// IG-214/IG-215: the hosted invoice page's backing endpoints - deliberately separate from
/// InvoiceEndpoints (every one of those is either account-owned-and-authenticated, or the fully
/// stateless /calculate), since these two are keyed by a public token instead and must never
/// require a session.
/// </summary>
public static class PublicInvoiceEndpoints
{
    public static IEndpointRouteBuilder MapPublicInvoiceEndpoints(this IEndpointRouteBuilder app)
    {
        // IG-71/FSD section 87 precedent (same as the anonymous PDF-generation endpoint in
        // DocumentEndpoints): anonymous AND either exposes account data or is computationally
        // expensive (QuestPDF rendering) - both endpoints get the same rate-limit treatment so a
        // token can't be brute-forced at volume even though its own entropy already makes guessing
        // impractical (defense in depth, matching PublicInvoiceTokenGenerator's own reasoning).
        app.MapGet("/api/v1/public/invoices/{token}", GetAsync).RequireRateLimiting(RateLimitingOptions.AuthPolicyName);
        app.MapGet("/api/v1/public/invoices/{token}/pdf", GetPdfAsync).RequireRateLimiting(RateLimitingOptions.AuthPolicyName);
        // IG-216: same anonymous, rate-limited treatment - both call out to Stripe's own API, so
        // this also protects against a token being used to hammer the platform's Stripe account.
        app.MapPost("/api/v1/public/invoices/{token}/checkout-session", CreateCheckoutSessionAsync).RequireRateLimiting(RateLimitingOptions.AuthPolicyName);
        app.MapGet("/api/v1/public/invoices/{token}/checkout-session/{sessionId}", ConfirmCheckoutSessionAsync).RequireRateLimiting(RateLimitingOptions.AuthPolicyName);
        return app;
    }

    private static async Task<IResult> GetAsync(string token, IInvoiceService invoiceService, CancellationToken cancellationToken)
    {
        var invoice = await invoiceService.GetHostedInvoiceAsync(token, cancellationToken);
        return Results.Ok(invoice);
    }

    private static async Task<IResult> GetPdfAsync(string token, IInvoiceService invoiceService, CancellationToken cancellationToken)
    {
        var request = await invoiceService.BuildHostedInvoicePdfRequestAsync(token, cancellationToken);
        var bytes = new InvoicePdfDocument(request).GeneratePdf();
        var filename = InvoiceFilenameGenerator.Generate(request.InvoiceNumber);

        return Results.File(bytes, "application/pdf", filename);
    }

    /// <summary>IG-216: success/cancel both return to this same hosted page - the frontend tells
    /// the two apart via the ?session_id query param Stripe appends to a successful redirect
    /// (Checkout's own {CHECKOUT_SESSION_ID} placeholder), same pattern InvoiceEndpoints.SendEmailAsync
    /// already uses for building a frontend-facing URL from Frontend:BaseUrl.</summary>
    private static async Task<IResult> CreateCheckoutSessionAsync(
        string token,
        IHostedCheckoutService hostedCheckoutService,
        IConfiguration configuration,
        CancellationToken cancellationToken)
    {
        var frontendBaseUrl = configuration["Frontend:BaseUrl"] ?? "http://localhost:3000";
        var hostedUrl = $"{frontendBaseUrl}/i/{token}";
        var successUrl = $"{hostedUrl}?session_id={{CHECKOUT_SESSION_ID}}";
        var cancelUrl = $"{hostedUrl}?checkout=cancelled";

        var session = await hostedCheckoutService.CreateSessionAsync(token, successUrl, cancelUrl, cancellationToken);
        return Results.Ok(session);
    }

    private static async Task<IResult> ConfirmCheckoutSessionAsync(string token, string sessionId, IHostedCheckoutService hostedCheckoutService, CancellationToken cancellationToken)
    {
        var confirmation = await hostedCheckoutService.ConfirmSessionAsync(token, sessionId, cancellationToken);
        return Results.Ok(confirmation);
    }
}
