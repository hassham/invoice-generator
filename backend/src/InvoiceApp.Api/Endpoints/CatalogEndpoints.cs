using System.Security.Claims;
using InvoiceApp.Application.Catalog;
using InvoiceApp.Modules.Catalog;

namespace InvoiceApp.Api.Endpoints;

public static class CatalogEndpoints
{
    public static IEndpointRouteBuilder MapCatalogEndpoints(this IEndpointRouteBuilder app)
    {
        // All account-owned (FSD section 93 / IG-57 AC) - every route requires a session, same
        // convention as CustomerEndpoints.
        app.MapGet("/api/v1/businesses/{businessId:guid}/items", ListAsync).RequireAuthorization();
        app.MapGet("/api/v1/businesses/{businessId:guid}/items/{id:guid}", GetAsync).RequireAuthorization();
        app.MapPost("/api/v1/businesses/{businessId:guid}/items", CreateAsync).RequireAuthorization();
        app.MapPut("/api/v1/businesses/{businessId:guid}/items/{id:guid}", UpdateAsync).RequireAuthorization();
        app.MapDelete("/api/v1/businesses/{businessId:guid}/items/{id:guid}", ArchiveAsync).RequireAuthorization();
        app.MapPost("/api/v1/businesses/{businessId:guid}/items/{id:guid}/duplicate", DuplicateAsync).RequireAuthorization();
        return app;
    }

    private static async Task<IResult> ListAsync(
        Guid businessId,
        ClaimsPrincipal user,
        ICatalogItemService catalogItemService,
        CancellationToken cancellationToken,
        bool includeArchived = false)
    {
        var items = await catalogItemService.ListAsync(UserId(user), businessId, includeArchived, cancellationToken);
        return Results.Ok(items);
    }

    private static async Task<IResult> GetAsync(
        Guid id,
        Guid businessId,
        ClaimsPrincipal user,
        ICatalogItemService catalogItemService,
        CancellationToken cancellationToken)
    {
        var item = await catalogItemService.GetAsync(UserId(user), businessId, id, cancellationToken);
        return Results.Ok(item);
    }

    private static async Task<IResult> CreateAsync(
        CatalogItemRequest request,
        Guid businessId,
        ClaimsPrincipal user,
        ICatalogItemService catalogItemService,
        CancellationToken cancellationToken)
    {
        CatalogItemRequestValidator.Validate(request);

        var item = await catalogItemService.CreateAsync(UserId(user), businessId, request, cancellationToken);
        return Results.Created($"/api/v1/businesses/{businessId}/items/{item.Id}", item);
    }

    private static async Task<IResult> UpdateAsync(
        Guid id,
        CatalogItemRequest request,
        Guid businessId,
        ClaimsPrincipal user,
        ICatalogItemService catalogItemService,
        CancellationToken cancellationToken)
    {
        CatalogItemRequestValidator.Validate(request);

        var item = await catalogItemService.UpdateAsync(UserId(user), businessId, id, request, cancellationToken);
        return Results.Ok(item);
    }

    private static async Task<IResult> ArchiveAsync(
        Guid id,
        Guid businessId,
        ClaimsPrincipal user,
        ICatalogItemService catalogItemService,
        CancellationToken cancellationToken)
    {
        await catalogItemService.ArchiveAsync(UserId(user), businessId, id, cancellationToken);
        return Results.NoContent();
    }

    private static async Task<IResult> DuplicateAsync(
        Guid id,
        Guid businessId,
        ClaimsPrincipal user,
        ICatalogItemService catalogItemService,
        CancellationToken cancellationToken)
    {
        var duplicate = await catalogItemService.DuplicateAsync(UserId(user), businessId, id, cancellationToken);
        return Results.Created($"/api/v1/businesses/{businessId}/items/{duplicate.Id}", duplicate);
    }

    private static Guid UserId(ClaimsPrincipal user) => Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
