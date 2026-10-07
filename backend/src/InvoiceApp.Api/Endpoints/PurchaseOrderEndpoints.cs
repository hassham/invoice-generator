using System.Security.Claims;
using InvoiceApp.Application.Purchasing;
using InvoiceApp.Modules.Documents.Pdf;
using QuestPDF.Fluent;

namespace InvoiceApp.Api.Endpoints;

public static class PurchaseOrderEndpoints
{
    public static IEndpointRouteBuilder MapPurchaseOrderEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/v1/businesses/{businessId:guid}/purchase-orders", CreateAsync).RequireAuthorization();
        app.MapGet("/api/v1/businesses/{businessId:guid}/purchase-orders", ListByBusinessAsync).RequireAuthorization();
        app.MapGet("/api/v1/businesses/{businessId:guid}/suppliers/{supplierId:guid}/purchase-orders", ListBySupplierAsync).RequireAuthorization();
        app.MapGet("/api/v1/businesses/{businessId:guid}/purchase-orders/{id:guid}", GetAsync).RequireAuthorization();
        app.MapDelete("/api/v1/businesses/{businessId:guid}/purchase-orders/{id:guid}", DeleteAsync).RequireAuthorization();
        // IG-306: renders through the shared invoice document engine, labelled "Purchase Order".
        app.MapGet("/api/v1/businesses/{businessId:guid}/purchase-orders/{id:guid}/pdf", GetPdfAsync).RequireAuthorization();
        return app;
    }

    private static async Task<IResult> CreateAsync(
        ClaimsPrincipal user,
        Guid businessId,
        IPurchaseOrderService poService,
        CreatePurchaseOrderCommand command,
        CancellationToken cancellationToken)
    {
        var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);

        try
        {
            var po = await poService.CreateAsync(userId, businessId, command, cancellationToken);
            return Results.Created($"/api/v1/businesses/{businessId}/purchase-orders/{po.Id}", po);
        }
        catch (InvalidOperationException ex)
        {
            return Results.BadRequest(new { detail = ex.Message });
        }
    }

    private static async Task<IResult> ListByBusinessAsync(
        ClaimsPrincipal user,
        Guid businessId,
        IPurchaseOrderService poService,
        CancellationToken cancellationToken)
    {
        var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);

        try
        {
            var pos = await poService.ListByBusinessAsync(userId, businessId, cancellationToken);
            return Results.Ok(pos);
        }
        catch (InvalidOperationException)
        {
            return Results.Unauthorized();
        }
    }

    private static async Task<IResult> ListBySupplierAsync(
        ClaimsPrincipal user,
        Guid businessId,
        Guid supplierId,
        IPurchaseOrderService poService,
        CancellationToken cancellationToken)
    {
        var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);

        try
        {
            var pos = await poService.ListBySupplierAsync(userId, businessId, supplierId, cancellationToken);
            return Results.Ok(pos);
        }
        catch (InvalidOperationException)
        {
            return Results.Unauthorized();
        }
    }

    private static async Task<IResult> GetAsync(
        ClaimsPrincipal user,
        Guid businessId,
        Guid id,
        IPurchaseOrderService poService,
        CancellationToken cancellationToken)
    {
        var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);

        try
        {
            var po = await poService.GetAsync(userId, businessId, id, cancellationToken);
            return Results.Ok(po);
        }
        catch (InvalidOperationException)
        {
            return Results.NotFound();
        }
    }

    private static async Task<IResult> GetPdfAsync(
        ClaimsPrincipal user,
        Guid businessId,
        Guid id,
        IPurchaseOrderService poService,
        CancellationToken cancellationToken)
    {
        var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);

        try
        {
            var pdfRequest = await poService.GetPdfRequestAsync(userId, businessId, id, cancellationToken);
            var pdfBytes = new InvoicePdfDocument(pdfRequest).GeneratePdf();

            return Results.File(pdfBytes, "application/pdf", $"{pdfRequest.InvoiceNumber}.pdf");
        }
        catch (InvalidOperationException)
        {
            return Results.NotFound();
        }
    }

    private static async Task<IResult> DeleteAsync(
        ClaimsPrincipal user,
        Guid businessId,
        Guid id,
        IPurchaseOrderService poService,
        CancellationToken cancellationToken)
    {
        var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);

        try
        {
            await poService.DeleteAsync(userId, businessId, id, cancellationToken);
            return Results.NoContent();
        }
        catch (InvalidOperationException)
        {
            return Results.NotFound();
        }
    }
}
