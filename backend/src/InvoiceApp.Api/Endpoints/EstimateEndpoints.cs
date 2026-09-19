using System.Security.Claims;
using InvoiceApp.Application.Estimates;
using InvoiceApp.Domain.Estimates;
using InvoiceApp.Modules.Invoicing;

namespace InvoiceApp.Api.Endpoints;

/// <summary>
/// IG-220: authenticated, account-owned - same shape as InvoiceEndpoints' Create/Update/Get/List,
/// deliberately without Cancel/Delete/Duplicate/send-email (out of this Story's scope, see
/// IEstimateService's own doc comment). PDF rendering deliberately reuses the existing stateless
/// POST /api/v1/invoices/pdf endpoint directly rather than a parallel /api/v1/estimates/pdf one -
/// InvoicePdfRequest is a pure value shape with no persisted-invoice coupling, and now carries a
/// DocumentTypeLabel field precisely so both document types can share this one endpoint.
/// </summary>
public static class EstimateEndpoints
{
    public static IEndpointRouteBuilder MapEstimateEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/v1/estimates", CreateAsync).RequireAuthorization();
        app.MapPut("/api/v1/estimates/{id:guid}", UpdateAsync).RequireAuthorization();
        app.MapGet("/api/v1/estimates/{id:guid}", GetAsync).RequireAuthorization();
        app.MapGet("/api/v1/estimates", ListAsync).RequireAuthorization();
        return app;
    }

    private static async Task<IResult> CreateAsync(
        EstimateSaveRequest request,
        ClaimsPrincipal user,
        IEstimateService estimateService,
        CancellationToken cancellationToken)
    {
        EstimateSaveRequestValidator.Validate(request);

        var estimate = await estimateService.SaveAsync(UserId(user), estimateId: null, request, cancellationToken);
        return Results.Created($"/api/v1/estimates/{estimate.Id}", estimate);
    }

    private static async Task<IResult> UpdateAsync(
        Guid id,
        EstimateSaveRequest request,
        ClaimsPrincipal user,
        IEstimateService estimateService,
        CancellationToken cancellationToken)
    {
        EstimateSaveRequestValidator.Validate(request);

        var estimate = await estimateService.SaveAsync(UserId(user), id, request, cancellationToken);
        return Results.Ok(estimate);
    }

    private static async Task<IResult> GetAsync(
        Guid id,
        ClaimsPrincipal user,
        IEstimateService estimateService,
        CancellationToken cancellationToken)
    {
        var estimate = await estimateService.GetAsync(UserId(user), id, cancellationToken);
        return Results.Ok(estimate);
    }

    private static async Task<IResult> ListAsync(
        ClaimsPrincipal user,
        IEstimateService estimateService,
        CancellationToken cancellationToken,
        int page = 1,
        int pageSize = 25,
        string? search = null,
        EstimateStatus? status = null)
    {
        var query = new EstimateListQuery(page, pageSize, search, status);
        var result = await estimateService.ListAsync(UserId(user), query, cancellationToken);
        return Results.Ok(result);
    }

    private static Guid UserId(ClaimsPrincipal user) => Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
