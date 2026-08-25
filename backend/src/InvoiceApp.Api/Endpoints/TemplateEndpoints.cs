using InvoiceApp.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace InvoiceApp.Api.Endpoints;

public static class TemplateEndpoints
{
    public static IEndpointRouteBuilder MapTemplateEndpoints(this IEndpointRouteBuilder app)
    {
        // No RequireAuthorization: global reference data, not account-specific - same reasoning
        // as /api/v1/invoices/calculate. Needed by both anonymous and authenticated invoice
        // creation (Epic IG-4).
        app.MapGet("/api/v1/templates", GetTemplates);
        return app;
    }

    private static async Task<IResult> GetTemplates(ApplicationDbContext db, CancellationToken cancellationToken)
    {
        var templates = await db.Templates
            .Where(t => t.IsActive)
            .OrderBy(t => t.SortOrder)
            .Select(t => new TemplateResponse(t.Id, t.Name, t.TemplateCode, t.PreviewImage, t.IsPremium, t.SortOrder))
            .ToListAsync(cancellationToken);

        return Results.Ok(templates);
    }
}

public sealed record TemplateResponse(Guid Id, string Name, string TemplateCode, string? PreviewImage, bool IsPremium, int SortOrder);
