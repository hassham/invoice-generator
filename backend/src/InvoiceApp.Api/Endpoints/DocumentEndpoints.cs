using InvoiceApp.Application.Documents;
using InvoiceApp.Infrastructure.Configuration;
using InvoiceApp.Modules.Documents.Pdf;
using QuestPDF.Fluent;

namespace InvoiceApp.Api.Endpoints;

public static class DocumentEndpoints
{
    public static IEndpointRouteBuilder MapDocumentEndpoints(this IEndpointRouteBuilder app)
    {
        // No RequireAuthorization: stateless, same reasoning as /api/v1/invoices/calculate -
        // IG-43 renders the authoritative invoice from the posted draft directly, it doesn't save
        // one (that needs Epic IG-7's persistence, which doesn't exist and isn't required by this
        // Story's AC).
        // IG-71 / FSD section 87: anonymous AND computationally expensive (QuestPDF rendering) -
        // exactly the combination RateLimitingOptions' own doc comment anticipated ("password
        // reset and PDF generation will join once built"). Reuses the same "auth" policy password
        // reset already joined, rather than inventing a second policy/config section for one
        // endpoint - partitioned by IP, same as every other user of this policy.
        app.MapPost("/api/v1/invoices/pdf", GeneratePdf).RequireRateLimiting(RateLimitingOptions.AuthPolicyName);
        return app;
    }

    private static IResult GeneratePdf(InvoicePdfRequest request)
    {
        InvoicePdfRequestValidator.Validate(request);

        var bytes = new InvoicePdfDocument(request).GeneratePdf();
        var filename = InvoiceFilenameGenerator.Generate(request.InvoiceNumber);

        return Results.File(bytes, "application/pdf", filename);
    }
}
