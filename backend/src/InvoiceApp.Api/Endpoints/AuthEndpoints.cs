using System.Security.Claims;
using InvoiceApp.Application.Identity;
using InvoiceApp.Infrastructure.Configuration;
using InvoiceApp.Modules.Identity.AccountDeletion;
using InvoiceApp.Modules.Identity.Login;
using InvoiceApp.Modules.Identity.Registration;
using Microsoft.AspNetCore.Mvc;

namespace InvoiceApp.Api.Endpoints;

public static class AuthEndpoints
{
    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/v1/auth/register", RegisterAsync).RequireRateLimiting(RateLimitingOptions.AuthPolicyName);
        app.MapPost("/api/v1/auth/login", LoginAsync).RequireRateLimiting(RateLimitingOptions.AuthPolicyName);
        app.MapPost("/api/v1/auth/logout", LogoutAsync).RequireAuthorization();
        app.MapGet("/api/v1/auth/me", Me).RequireAuthorization();
        app.MapDelete("/api/v1/auth/account", DeleteAccountAsync).RequireAuthorization();
        return app;
    }

    private static async Task<IResult> RegisterAsync(
        RegisterAccountRequest request,
        IAccountRegistrationService registrationService,
        IAuthSessionService authSessionService,
        CancellationToken cancellationToken)
    {
        RegistrationRequestValidator.Validate(request);

        var registered = await registrationService.RegisterAsync(request, cancellationToken);
        await authSessionService.SignInAsync(registered.UserId, cancellationToken);

        return Results.Ok(new RegisterResponse(registered.UserId, request.Email, request.Name, registered.BusinessId));
    }

    private static async Task<IResult> LoginAsync(
        LoginRequest request,
        ICredentialLoginService loginService,
        CancellationToken cancellationToken)
    {
        LoginRequestValidator.Validate(request);

        var loggedIn = await loginService.SignInWithPasswordAsync(request, cancellationToken);

        return Results.Ok(loggedIn);
    }

    private static async Task<IResult> LogoutAsync(IAuthSessionService authSessionService, CancellationToken cancellationToken)
    {
        await authSessionService.SignOutAsync(cancellationToken);
        return Results.Ok();
    }

    private static async Task<IResult> Me(
        ClaimsPrincipal user,
        IAuthSessionService authSessionService,
        CancellationToken cancellationToken)
    {
        // Identity's default ClaimTypes.Name claim reflects UserName (set to the email at
        // registration), not the display Name property - reading the account's own record
        // avoids returning the wrong value for Name.
        var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var account = await authSessionService.GetCurrentAsync(userId, cancellationToken);

        return account is null ? Results.Unauthorized() : Results.Ok(account);
    }

    private static async Task<IResult> DeleteAccountAsync(
        [FromBody] DeleteAccountRequest request,
        ClaimsPrincipal user,
        IAccountDeletionService accountDeletionService,
        CancellationToken cancellationToken)
    {
        DeleteAccountRequestValidator.Validate(request);

        var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
        await accountDeletionService.DeleteAsync(userId, request.CurrentPassword, cancellationToken);

        return Results.Ok();
    }
}

public sealed record RegisterResponse(Guid UserId, string Email, string? Name, Guid BusinessId);
