using System.Security.Claims;
using InvoiceApp.Application.Businesses;
using InvoiceApp.Modules.Businesses;

namespace InvoiceApp.Api.Endpoints;

public static class BusinessEndpoints
{
    public static IEndpointRouteBuilder MapBusinessEndpoints(this IEndpointRouteBuilder app)
    {
        // Account-owned (FSD sections 62/63 / IG-53 AC) - every account has exactly one Business
        // row (created at registration), so there's no id in the route, just GET/PUT.
        app.MapGet("/api/v1/business", GetAsync).RequireAuthorization();
        app.MapPut("/api/v1/business", UpdateAsync).RequireAuthorization();
        // IG-54: has a side effect (increments NextInvoiceNumber), so POST rather than GET even
        // though it doesn't create a resource of its own.
        app.MapPost("/api/v1/business/next-invoice-number", GenerateNextInvoiceNumberAsync).RequireAuthorization();
        return app;
    }

    private static async Task<IResult> GetAsync(
        ClaimsPrincipal user,
        IBusinessService businessService,
        CancellationToken cancellationToken)
    {
        var profile = await businessService.GetAsync(UserId(user), cancellationToken);
        return Results.Ok(profile);
    }

    private static async Task<IResult> UpdateAsync(
        BusinessProfileRequest request,
        ClaimsPrincipal user,
        IBusinessService businessService,
        CancellationToken cancellationToken)
    {
        BusinessProfileRequestValidator.Validate(request);

        var profile = await businessService.UpdateAsync(UserId(user), request, cancellationToken);
        return Results.Ok(profile);
    }

    private static async Task<IResult> GenerateNextInvoiceNumberAsync(
        ClaimsPrincipal user,
        IBusinessService businessService,
        CancellationToken cancellationToken)
    {
        var generated = await businessService.GenerateNextInvoiceNumberAsync(UserId(user), cancellationToken);
        return Results.Ok(generated);
    }

    private static Guid UserId(ClaimsPrincipal user) => Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
