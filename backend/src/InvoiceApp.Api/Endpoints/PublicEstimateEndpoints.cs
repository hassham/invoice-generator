using InvoiceApp.Application.Estimates;
using InvoiceApp.Infrastructure.Configuration;
using InvoiceApp.Modules.Documents.Pdf;
using QuestPDF.Fluent;

namespace InvoiceApp.Api.Endpoints;

/// <summary>
/// IG-221: the hosted estimate page's backing endpoints - mirrors PublicInvoiceEndpoints exactly
/// (anonymous, token-keyed, same rate-limit treatment). No Accept/Decline action here - IG-222's
/// own scope.
/// </summary>
public static class PublicEstimateEndpoints
{
    public static IEndpointRouteBuilder MapPublicEstimateEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/v1/public/estimates/{token}", GetAsync).RequireRateLimiting(RateLimitingOptions.AuthPolicyName);
        app.MapGet("/api/v1/public/estimates/{token}/pdf", GetPdfAsync).RequireRateLimiting(RateLimitingOptions.AuthPolicyName);
        return app;
    }

    private static async Task<IResult> GetAsync(string token, IEstimateService estimateService, CancellationToken cancellationToken)
    {
        var estimate = await estimateService.GetHostedEstimateAsync(token, cancellationToken);
        return Results.Ok(estimate);
    }

    private static async Task<IResult> GetPdfAsync(string token, IEstimateService estimateService, CancellationToken cancellationToken)
    {
        var request = await estimateService.BuildHostedEstimatePdfRequestAsync(token, cancellationToken);
        var bytes = new InvoicePdfDocument(request).GeneratePdf();
        var filename = InvoiceFilenameGenerator.Generate(request.InvoiceNumber, "Estimate");

        return Results.File(bytes, "application/pdf", filename);
    }
}
