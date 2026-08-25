using System.Security.Claims;
using InvoiceApp.Application.Exceptions;
using InvoiceApp.Application.Identity;
using InvoiceApp.Infrastructure.Configuration;
using InvoiceApp.Infrastructure.Identity;
using InvoiceApp.Modules.Identity.AccountDeletion;
using InvoiceApp.Modules.Identity.Login;
using InvoiceApp.Modules.Identity.PasswordReset;
using InvoiceApp.Modules.Identity.Registration;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace InvoiceApp.Api.Endpoints;

public static class AuthEndpoints
{
    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/v1/auth/register", RegisterAsync).RequireRateLimiting(RateLimitingOptions.AuthPolicyName);
        app.MapPost("/api/v1/auth/login", LoginAsync).RequireRateLimiting(RateLimitingOptions.AuthPolicyName);
        app.MapPost("/api/v1/auth/forgot-password", ForgotPasswordAsync).RequireRateLimiting(RateLimitingOptions.AuthPolicyName);
        app.MapPost("/api/v1/auth/reset-password", ResetPasswordAsync).RequireRateLimiting(RateLimitingOptions.AuthPolicyName);
        app.MapPost("/api/v1/auth/logout", LogoutAsync).RequireAuthorization();
        app.MapGet("/api/v1/auth/me", Me).RequireAuthorization();
        app.MapDelete("/api/v1/auth/account", DeleteAccountAsync).RequireAuthorization();
        app.MapGet("/api/v1/auth/google/login", GoogleLogin);
        app.MapGet("/api/v1/auth/google/callback", GoogleCallbackAsync);
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

    private static async Task<IResult> ForgotPasswordAsync(
        ForgotPasswordRequest request,
        IPasswordResetService passwordResetService,
        CancellationToken cancellationToken)
    {
        ForgotPasswordRequestValidator.Validate(request);

        await passwordResetService.RequestResetAsync(request.Email, cancellationToken);

        // Always 200, whether or not the email matched an account (FSD 9) - PasswordResetService
        // itself is what silently no-ops for an unknown/inactive account.
        return Results.Ok();
    }

    private static async Task<IResult> ResetPasswordAsync(
        ResetPasswordRequest request,
        IPasswordResetService passwordResetService,
        CancellationToken cancellationToken)
    {
        ResetPasswordRequestValidator.Validate(request);

        await passwordResetService.ResetPasswordAsync(request, cancellationToken);

        return Results.Ok();
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

    private static IResult GoogleLogin()
    {
        var properties = new AuthenticationProperties { RedirectUri = "/api/v1/auth/google/callback" };
        return Results.Challenge(properties, [GoogleDefaults.AuthenticationScheme]);
    }

    private static async Task<IResult> GoogleCallbackAsync(
        HttpContext httpContext,
        SignInManager<ApplicationUser> signInManager,
        IExternalLoginService externalLoginService,
        CancellationToken cancellationToken)
    {
        if (httpContext.Request.Query.ContainsKey("error"))
        {
            // InfrastructureAuthenticationExtensions' OnRemoteFailure redirects here with
            // ?error=... on cancellation or a genuine provider failure - the raw reason is never
            // trusted or echoed back to the client (IG-94; matches GlobalExceptionHandler's
            // client-safe messaging elsewhere).
            throw new ValidationException("Google sign-in was cancelled or failed. Please try again.");
        }

        var externalLoginInfo = await signInManager.GetExternalLoginInfoAsync()
            ?? throw new ValidationException("Google sign-in session expired. Please try again.");

        var emailVerifiedValue = externalLoginInfo.Principal.FindFirstValue("email_verified");
        var request = new ExternalLoginRequest(
            externalLoginInfo.LoginProvider,
            externalLoginInfo.ProviderKey,
            externalLoginInfo.Principal.FindFirstValue(ClaimTypes.Email),
            externalLoginInfo.Principal.FindFirstValue(ClaimTypes.Name),
            EmailVerified: bool.TryParse(emailVerifiedValue, out var verified) && verified);

        var loggedIn = await externalLoginService.SignInOrRegisterAsync(request, cancellationToken);

        // No frontend page exists yet to redirect to (same gap as every other Epic IG-3
        // endpoint) - returns the account directly, same shape as /login, rather than a 302 to a
        // route that doesn't exist.
        return Results.Ok(loggedIn);
    }
}

public sealed record RegisterResponse(Guid UserId, string Email, string? Name, Guid BusinessId);
