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
        // DisableAntiforgery(): ASP.NET Core 8 Minimal APIs auto-require an antiforgery token on
        // any endpoint that binds IFormFile, but this app has no antiforgery middleware anywhere
        // (protected instead by the strict CORS allowlist + AllowCredentials() in Program.cs) -
        // without this the endpoint 500s with "no middleware was found that supports
        // anti-forgery" on every request, confirmed by actually hitting it, not assumed.
        app.MapPost("/api/v1/business/logo", UploadLogoAsync).RequireAuthorization().DisableAntiforgery();
        app.MapDelete("/api/v1/business/logo", RemoveLogoAsync).RequireAuthorization();
        // IG-52: deliberately anonymous and keyed by businessId, not the caller's session - unlike
        // every other IBusinessService method (see its own doc comment on "never a
        // caller-supplied id"). A logo needs to render in <img> tags and PDF/print output that an
        // unauthenticated invoice recipient can view (same reasoning IG-28 established for
        // anonymous invoice creation). Nothing sensitive is exposed - the id is an opaque,
        // non-enumerable GUID and the response is just an image.
        app.MapGet("/api/v1/business/logo/{businessId:guid}", GetLogoAsync);
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

    private static async Task<IResult> UploadLogoAsync(
        IFormFile file,
        ClaimsPrincipal user,
        IBusinessService businessService,
        CancellationToken cancellationToken)
    {
        await using var content = file.OpenReadStream();
        await BusinessLogoValidator.ValidateAsync(content, file.ContentType, file.Length, cancellationToken);

        var profile = await businessService.UploadLogoAsync(UserId(user), content, file.ContentType, cancellationToken);
        return Results.Ok(profile);
    }

    private static async Task<IResult> RemoveLogoAsync(
        ClaimsPrincipal user,
        IBusinessService businessService,
        CancellationToken cancellationToken)
    {
        var profile = await businessService.RemoveLogoAsync(UserId(user), cancellationToken);
        return Results.Ok(profile);
    }

    private static async Task<IResult> GetLogoAsync(Guid businessId, IBusinessLogoStorage logoStorage)
    {
        var located = logoStorage.Locate(businessId);
        if (located is null)
        {
            return Results.NotFound();
        }

        var bytes = await File.ReadAllBytesAsync(located.PhysicalPath);
        return Results.File(bytes, located.ContentType);
    }

    private static Guid UserId(ClaimsPrincipal user) => Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
