using System.Security.Claims;
using InvoiceApp.Application.Invoicing;
using InvoiceApp.Domain.Invoicing;
using InvoiceApp.Modules.Invoicing;

namespace InvoiceApp.Api.Endpoints;

public static class InvoiceEndpoints
{
    public static IEndpointRouteBuilder MapInvoiceEndpoints(this IEndpointRouteBuilder app)
    {
        // No [RequireAuthorization]: anonymous invoice creation is a first-class scenario
        // (FSD section 10.1's /invoice/create route, Epic IG-4) - this endpoint is stateless and
        // reads nothing account-specific, so there's no reason to gate it behind a session.
        app.MapPost("/api/v1/invoices/calculate", Calculate);

        // IG-45/IG-47/IG-62: "As an authenticated user..." - unlike /calculate and /pdf above,
        // these all read or write account-owned data, so all require a session.
        app.MapPost("/api/v1/invoices", CreateAsync).RequireAuthorization();
        app.MapPut("/api/v1/invoices/{id:guid}", UpdateAsync).RequireAuthorization();
        app.MapGet("/api/v1/invoices/{id:guid}", GetAsync).RequireAuthorization();
        app.MapGet("/api/v1/invoices", ListAsync).RequireAuthorization();
        // IG-49: same DELETE-archives-not-hard-deletes convention as CustomerEndpoints.
        app.MapPost("/api/v1/invoices/{id:guid}/cancel", CancelAsync).RequireAuthorization();
        app.MapDelete("/api/v1/invoices/{id:guid}", DeleteAsync).RequireAuthorization();
        app.MapPost("/api/v1/invoices/{id:guid}/duplicate", DuplicateAsync).RequireAuthorization();
        return app;
    }

    private static IResult Calculate(InvoiceCalculationRequest request)
    {
        InvoiceCalculationRequestValidator.Validate(request);

        var result = InvoiceCalculator.Calculate(request);

        return Results.Ok(result);
    }

    private static async Task<IResult> CreateAsync(
        InvoiceSaveRequest request,
        ClaimsPrincipal user,
        IInvoiceService invoiceService,
        CancellationToken cancellationToken)
    {
        InvoiceSaveRequestValidator.Validate(request);

        var invoice = await invoiceService.SaveAsync(UserId(user), invoiceId: null, request, cancellationToken);
        return Results.Created($"/api/v1/invoices/{invoice.Id}", invoice);
    }

    private static async Task<IResult> UpdateAsync(
        Guid id,
        InvoiceSaveRequest request,
        ClaimsPrincipal user,
        IInvoiceService invoiceService,
        CancellationToken cancellationToken)
    {
        InvoiceSaveRequestValidator.Validate(request);

        var invoice = await invoiceService.SaveAsync(UserId(user), id, request, cancellationToken);
        return Results.Ok(invoice);
    }

    private static async Task<IResult> GetAsync(
        Guid id,
        ClaimsPrincipal user,
        IInvoiceService invoiceService,
        CancellationToken cancellationToken)
    {
        var invoice = await invoiceService.GetAsync(UserId(user), id, cancellationToken);
        return Results.Ok(invoice);
    }

    private static async Task<IResult> ListAsync(
        ClaimsPrincipal user,
        IInvoiceService invoiceService,
        CancellationToken cancellationToken,
        int page = 1,
        int pageSize = 25,
        string? search = null,
        InvoiceStatus? status = null,
        DateOnly? startDate = null,
        DateOnly? endDate = null,
        Guid? customerId = null,
        InvoiceSortOption sort = InvoiceSortOption.Newest)
    {
        var query = new InvoiceListQuery(page, pageSize, search, status, startDate, endDate, customerId, sort);
        var result = await invoiceService.ListAsync(UserId(user), query, cancellationToken);
        return Results.Ok(result);
    }

    private static async Task<IResult> CancelAsync(
        Guid id,
        ClaimsPrincipal user,
        IInvoiceService invoiceService,
        CancellationToken cancellationToken)
    {
        var invoice = await invoiceService.CancelAsync(UserId(user), id, cancellationToken);
        return Results.Ok(invoice);
    }

    private static async Task<IResult> DeleteAsync(
        Guid id,
        ClaimsPrincipal user,
        IInvoiceService invoiceService,
        CancellationToken cancellationToken)
    {
        await invoiceService.DeleteAsync(UserId(user), id, cancellationToken);
        return Results.NoContent();
    }

    private static async Task<IResult> DuplicateAsync(
        Guid id,
        ClaimsPrincipal user,
        IInvoiceService invoiceService,
        CancellationToken cancellationToken)
    {
        var invoice = await invoiceService.DuplicateAsync(UserId(user), id, cancellationToken);
        return Results.Created($"/api/v1/invoices/{invoice.Id}", invoice);
    }

    private static Guid UserId(ClaimsPrincipal user) => Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
