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
        app.MapGet("/api/v1/items", ListAsync).RequireAuthorization();
        app.MapGet("/api/v1/items/{id:guid}", GetAsync).RequireAuthorization();
        app.MapPost("/api/v1/items", CreateAsync).RequireAuthorization();
        app.MapPut("/api/v1/items/{id:guid}", UpdateAsync).RequireAuthorization();
        app.MapDelete("/api/v1/items/{id:guid}", ArchiveAsync).RequireAuthorization();
        app.MapPost("/api/v1/items/{id:guid}/duplicate", DuplicateAsync).RequireAuthorization();
        return app;
    }

    private static async Task<IResult> ListAsync(
        ClaimsPrincipal user,
        ICatalogItemService catalogItemService,
        CancellationToken cancellationToken,
        bool includeArchived = false)
    {
        var items = await catalogItemService.ListAsync(UserId(user), includeArchived, cancellationToken);
        return Results.Ok(items);
    }

    private static async Task<IResult> GetAsync(
        Guid id,
        ClaimsPrincipal user,
        ICatalogItemService catalogItemService,
        CancellationToken cancellationToken)
    {
        var item = await catalogItemService.GetAsync(UserId(user), id, cancellationToken);
        return Results.Ok(item);
    }

    private static async Task<IResult> CreateAsync(
        CatalogItemRequest request,
        ClaimsPrincipal user,
        ICatalogItemService catalogItemService,
        CancellationToken cancellationToken)
    {
        CatalogItemRequestValidator.Validate(request);

        var item = await catalogItemService.CreateAsync(UserId(user), request, cancellationToken);
        return Results.Created($"/api/v1/items/{item.Id}", item);
    }

    private static async Task<IResult> UpdateAsync(
        Guid id,
        CatalogItemRequest request,
        ClaimsPrincipal user,
        ICatalogItemService catalogItemService,
        CancellationToken cancellationToken)
    {
        CatalogItemRequestValidator.Validate(request);

        var item = await catalogItemService.UpdateAsync(UserId(user), id, request, cancellationToken);
        return Results.Ok(item);
    }

    private static async Task<IResult> ArchiveAsync(
        Guid id,
        ClaimsPrincipal user,
        ICatalogItemService catalogItemService,
        CancellationToken cancellationToken)
    {
        await catalogItemService.ArchiveAsync(UserId(user), id, cancellationToken);
        return Results.NoContent();
    }

    private static async Task<IResult> DuplicateAsync(
        Guid id,
        ClaimsPrincipal user,
        ICatalogItemService catalogItemService,
        CancellationToken cancellationToken)
    {
        var duplicate = await catalogItemService.DuplicateAsync(UserId(user), id, cancellationToken);
        return Results.Created($"/api/v1/items/{duplicate.Id}", duplicate);
    }

    private static Guid UserId(ClaimsPrincipal user) => Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
