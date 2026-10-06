using System.Security.Claims;
using InvoiceApp.Application.Invoicing;

namespace InvoiceApp.Api.Endpoints;

public static class CreditNoteEndpoints
{
    public static IEndpointRouteBuilder MapCreditNoteEndpoints(this IEndpointRouteBuilder app)
    {
        // IG-234: Create a credit note against an invoice
        app.MapPost("/api/v1/businesses/{businessId:guid}/credit-notes", CreateAsync).RequireAuthorization();
        // IG-234: List credit notes for an invoice
        app.MapGet("/api/v1/businesses/{businessId:guid}/invoices/{invoiceId:guid}/credit-notes", ListByInvoiceAsync).RequireAuthorization();
        // IG-234: List all credit notes for a business
        app.MapGet("/api/v1/businesses/{businessId:guid}/credit-notes", ListByBusinessAsync).RequireAuthorization();
        // IG-234: Get a specific credit note
        app.MapGet("/api/v1/businesses/{businessId:guid}/credit-notes/{id:guid}", GetAsync).RequireAuthorization();
        // IG-234: Delete a credit note
        app.MapDelete("/api/v1/businesses/{businessId:guid}/credit-notes/{id:guid}", DeleteAsync).RequireAuthorization();
        return app;
    }

    private static async Task<IResult> CreateAsync(
        ClaimsPrincipal user,
        Guid businessId,
        ICreditNoteService creditNoteService,
        CreateCreditNoteCommand command,
        CancellationToken cancellationToken)
    {
        var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);

        try
        {
            var creditNote = await creditNoteService.CreateAsync(userId, businessId, command, cancellationToken);
            return Results.Created($"/api/v1/businesses/{businessId}/credit-notes/{creditNote.Id}", creditNote);
        }
        catch (ArgumentException ex)
        {
            return Results.BadRequest(new { detail = ex.Message });
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
        ICreditNoteService creditNoteService,
        CancellationToken cancellationToken)
    {
        var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);

        try
        {
            var creditNotes = await creditNoteService.ListByInvoiceAsync(userId, businessId, invoiceId, cancellationToken);
            return Results.Ok(creditNotes);
        }
        catch (InvalidOperationException)
        {
            return Results.Unauthorized();
        }
    }

    private static async Task<IResult> ListByBusinessAsync(
        ClaimsPrincipal user,
        Guid businessId,
        ICreditNoteService creditNoteService,
        CancellationToken cancellationToken)
    {
        var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);

        try
        {
            var creditNotes = await creditNoteService.ListByBusinessAsync(userId, businessId, cancellationToken);
            return Results.Ok(creditNotes);
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
        ICreditNoteService creditNoteService,
        CancellationToken cancellationToken)
    {
        var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);

        try
        {
            var creditNote = await creditNoteService.GetAsync(userId, businessId, id, cancellationToken);
            return Results.Ok(creditNote);
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
        ICreditNoteService creditNoteService,
        CancellationToken cancellationToken)
    {
        var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);

        try
        {
            await creditNoteService.DeleteAsync(userId, businessId, id, cancellationToken);
            return Results.NoContent();
        }
        catch (InvalidOperationException)
        {
            return Results.NotFound();
        }
    }
}
