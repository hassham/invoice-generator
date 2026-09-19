using System.Security.Claims;
using System.Security.Cryptography;
using InvoiceApp.Application.Businesses;
using InvoiceApp.Application.Payments;
using InvoiceApp.Modules.Businesses;

namespace InvoiceApp.Api.Endpoints;

public static class BusinessEndpoints
{
    // IG-219: the cookie carrying the anti-CSRF state token between the /connect redirect-out
    // and the /callback redirect-back - short-lived (the whole round trip through Stripe's
    // consent screen normally takes seconds, not minutes), HttpOnly (never read by JS), and Lax
    // (a top-level GET navigation still sends it, which is exactly the request shape Stripe's
    // redirect-back uses - Strict would drop it).
    private const string StripeOAuthStateCookieName = "stripe_oauth_state";

    public static IEndpointRouteBuilder MapBusinessEndpoints(this IEndpointRouteBuilder app)
    {
        // Account-owned (FSD sections 62/63 / IG-53 AC) - every account has exactly one Business
        // row (created at registration), so there's no id in the route, just GET/PUT.
        app.MapGet("/api/v1/business", GetAsync).RequireAuthorization();
        app.MapPut("/api/v1/business", UpdateAsync).RequireAuthorization();
        // IG-54: has a side effect (increments NextInvoiceNumber), so POST rather than GET even
        // though it doesn't create a resource of its own.
        app.MapPost("/api/v1/business/next-invoice-number", GenerateNextInvoiceNumberAsync).RequireAuthorization();
        // IG-220: same "has a side effect" reasoning as next-invoice-number above.
        app.MapPost("/api/v1/business/next-estimate-number", GenerateNextEstimateNumberAsync).RequireAuthorization();
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
        // IG-219: "Connect with Stripe" - a genuine top-level browser redirect out to Stripe's own
        // consent screen and back (same reasoning LoginForm's Google link documents: this can't be
        // a fetch/XHR call), so these three are plain GETs/a POST, not RPC-shaped JSON calls.
        app.MapGet("/api/v1/business/stripe/connect", ConnectStripeAsync).RequireAuthorization();
        app.MapGet("/api/v1/business/stripe/callback", StripeCallbackAsync).RequireAuthorization();
        app.MapPost("/api/v1/business/stripe/disconnect", DisconnectStripeAsync).RequireAuthorization();
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

    private static async Task<IResult> GenerateNextEstimateNumberAsync(
        ClaimsPrincipal user,
        IBusinessService businessService,
        CancellationToken cancellationToken)
    {
        var generated = await businessService.GenerateNextEstimateNumberAsync(UserId(user), cancellationToken);
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

    /// <summary>IG-219: redirects to Stripe's own consent screen. Unlike GoogleLogin (a framework
    /// Results.Challenge - ASP.NET's Google handler generates and verifies its own correlation
    /// state internally), Stripe Connect isn't a built-in provider, so the anti-CSRF state token
    /// is hand-rolled here: a random value carried in a short-lived cookie, verified against the
    /// query-string value StripeCallbackAsync receives back.</summary>
    private static IResult ConnectStripeAsync(HttpContext httpContext, IStripeConnectService stripeConnectService)
    {
        var state = Convert.ToHexString(RandomNumberGenerator.GetBytes(16));
        httpContext.Response.Cookies.Append(StripeOAuthStateCookieName, state, new CookieOptions
        {
            HttpOnly = true,
            Secure = httpContext.Request.IsHttps,
            SameSite = SameSiteMode.Lax,
            MaxAge = TimeSpan.FromMinutes(10),
        });

        var redirectUri = $"{httpContext.Request.Scheme}://{httpContext.Request.Host}/api/v1/business/stripe/callback";
        return Results.Redirect(stripeConnectService.BuildAuthorizeUrl(redirectUri, state));
    }

    private static async Task<IResult> StripeCallbackAsync(
        HttpContext httpContext,
        ClaimsPrincipal user,
        IStripeConnectService stripeConnectService,
        IBusinessService businessService,
        IConfiguration configuration,
        CancellationToken cancellationToken)
    {
        var frontendBaseUrl = configuration["Frontend:BaseUrl"] ?? "http://localhost:3000";
        var settingsUrl = $"{frontendBaseUrl}/settings/business";

        var cookieState = httpContext.Request.Cookies[StripeOAuthStateCookieName];
        httpContext.Response.Cookies.Delete(StripeOAuthStateCookieName);

        // Stripe declining/failing, the state cookie missing/mismatched (expired, or a forged
        // callback with no corresponding /connect redirect), and the exchange itself failing
        // (invalid/already-used code) all land the visitor back on Settings with a friendly inline
        // banner instead of a raw error response - a lower-stakes, more recoverable flow than
        // GoogleCallbackAsync's sign-in path (throwing there is fine because a failed *login*
        // leaves the visitor with nothing to do but retry; a failed *connect* attempt should let
        // them just try again from the same settings page they were already on).
        if (httpContext.Request.Query.ContainsKey("error")
            || string.IsNullOrEmpty(cookieState)
            || cookieState != httpContext.Request.Query["state"]
            || !httpContext.Request.Query.TryGetValue("code", out var code))
        {
            return Results.Redirect($"{settingsUrl}?stripeConnectError=1");
        }

        try
        {
            var stripeAccountId = await stripeConnectService.ExchangeCodeForAccountIdAsync(code.ToString(), cancellationToken);
            await businessService.ConnectStripeAsync(UserId(user), stripeAccountId, cancellationToken);
        }
        catch (Exception)
        {
            return Results.Redirect($"{settingsUrl}?stripeConnectError=1");
        }

        return Results.Redirect($"{settingsUrl}?stripeConnected=1");
    }

    private static async Task<IResult> DisconnectStripeAsync(
        ClaimsPrincipal user,
        IStripeConnectService stripeConnectService,
        IBusinessService businessService,
        CancellationToken cancellationToken)
    {
        var userId = UserId(user);
        var profile = await businessService.GetAsync(userId, cancellationToken);
        if (profile.StripeAccountId is { } stripeAccountId)
        {
            await stripeConnectService.DeauthorizeAsync(stripeAccountId, cancellationToken);
            profile = await businessService.DisconnectStripeAsync(userId, cancellationToken);
        }

        return Results.Ok(profile);
    }

    private static Guid UserId(ClaimsPrincipal user) => Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
