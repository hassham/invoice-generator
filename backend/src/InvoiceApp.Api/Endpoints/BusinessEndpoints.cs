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

    private static Guid UserId(ClaimsPrincipal user) => Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
