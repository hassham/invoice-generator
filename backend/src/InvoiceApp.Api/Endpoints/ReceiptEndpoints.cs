using System.Security.Claims;
using InvoiceApp.Application.Documents;
using InvoiceApp.Application.Payments;
using InvoiceApp.Modules.Documents.Pdf;
using QuestPDF.Fluent;

namespace InvoiceApp.Api.Endpoints;

public static class ReceiptEndpoints
{
    public static IEndpointRouteBuilder MapReceiptEndpoints(this IEndpointRouteBuilder app)
    {
        // IG-235: Create a receipt from a payment
        app.MapPost("/api/v1/businesses/{businessId:guid}/receipts", CreateAsync).RequireAuthorization();
        // IG-235: List receipts for an invoice
        app.MapGet("/api/v1/businesses/{businessId:guid}/invoices/{invoiceId:guid}/receipts", ListByInvoiceAsync).RequireAuthorization();
        // IG-235: List all receipts for a business
        app.MapGet("/api/v1/businesses/{businessId:guid}/receipts", ListByBusinessAsync).RequireAuthorization();
        // IG-235: Get a specific receipt
        app.MapGet("/api/v1/businesses/{businessId:guid}/receipts/{id:guid}", GetAsync).RequireAuthorization();
        // IG-235: Download receipt as PDF
        app.MapGet("/api/v1/businesses/{businessId:guid}/receipts/{id:guid}/pdf", GetPdfAsync).RequireAuthorization();
        // IG-235: Delete a receipt
        app.MapDelete("/api/v1/businesses/{businessId:guid}/receipts/{id:guid}", DeleteAsync).RequireAuthorization();
        return app;
    }

    private static async Task<IResult> CreateAsync(
        ClaimsPrincipal user,
        Guid businessId,
        IReceiptService receiptService,
        CreateReceiptCommand command,
        CancellationToken cancellationToken)
    {
        var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);

        try
        {
            var receipt = await receiptService.CreateAsync(userId, businessId, command, cancellationToken);
            return Results.Created($"/api/v1/businesses/{businessId}/receipts/{receipt.Id}", receipt);
        }
        catch (InvalidOperationException ex)
        {
            return Results.BadRequest(new { detail = ex.Message });
        }
    }

    private static async Task<IResult> ListByInvoiceAsync(
        ClaimsPrincipal user,
        Guid businessId,
        Guid invoiceId,
        IReceiptService receiptService,
        CancellationToken cancellationToken)
    {
        var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);

        try
        {
            var receipts = await receiptService.ListByInvoiceAsync(userId, businessId, invoiceId, cancellationToken);
            return Results.Ok(receipts);
        }
        catch (InvalidOperationException)
        {
            return Results.Unauthorized();
        }
    }

    private static async Task<IResult> ListByBusinessAsync(
        ClaimsPrincipal user,
        Guid businessId,
        IReceiptService receiptService,
        CancellationToken cancellationToken)
    {
        var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);

        try
        {
            var receipts = await receiptService.ListByBusinessAsync(userId, businessId, cancellationToken);
            return Results.Ok(receipts);
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
        IReceiptService receiptService,
        CancellationToken cancellationToken)
    {
        var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);

        try
        {
            var receipt = await receiptService.GetAsync(userId, businessId, id, cancellationToken);
            return Results.Ok(receipt);
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
        IReceiptService receiptService,
        CancellationToken cancellationToken)
    {
        var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);

        try
        {
            var receipt = await receiptService.GetAsync(userId, businessId, id, cancellationToken);

            var pdfRequest = new ReceiptPdfRequest(
                receipt.ReceiptNumber,
                receipt.IssueDate,
                receipt.InvoiceNumber,
                receipt.Amount,
                receipt.PaymentDate,
                receipt.PaymentMethod.ToString(),
                receipt.Currency,
                receipt.BusinessName,
                receipt.BusinessEmail,
                null
            );

            var pdfBytes = new ReceiptPdfDocument(pdfRequest).GeneratePdf();

            return Results.File(pdfBytes, "application/pdf", $"{receipt.ReceiptNumber}.pdf");
        }
        catch (InvalidOperationException)
        {
            return Results.NotFound();
        }
        catch (Exception ex)
        {
            return Results.BadRequest(new { detail = ex.Message });
        }
    }

    private static async Task<IResult> DeleteAsync(
        ClaimsPrincipal user,
        Guid businessId,
        Guid id,
        IReceiptService receiptService,
        CancellationToken cancellationToken)
    {
        var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);

        try
        {
            await receiptService.DeleteAsync(userId, businessId, id, cancellationToken);
            return Results.NoContent();
        }
        catch (InvalidOperationException)
        {
            return Results.NotFound();
        }
    }
}
