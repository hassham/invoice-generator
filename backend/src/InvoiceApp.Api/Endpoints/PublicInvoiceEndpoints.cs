using InvoiceApp.Application.Invoicing;
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
}
