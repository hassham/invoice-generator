using System.Security.Claims;
using InvoiceApp.Application.Identity;
using InvoiceApp.Infrastructure.Configuration;
using InvoiceApp.Infrastructure.Identity;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace InvoiceApp.Infrastructure.Authentication;

public static class InfrastructureAuthenticationExtensions
{
    public static IServiceCollection AddInfrastructureAuthentication(this IServiceCollection services, IConfiguration configuration)
    {
        var googleOptions = configuration.GetSection(GoogleAuthenticationOptions.SectionName).Get<GoogleAuthenticationOptions>()
            ?? new GoogleAuthenticationOptions();

        // SignInManager<TUser> requires IHttpContextAccessor - without it, resolving it (and
        // therefore AuthSessionService) throws at request time, not at startup.
        services.AddHttpContextAccessor();

        services.AddAuthentication(IdentityConstants.ApplicationScheme)
            .AddCookie(IdentityConstants.ApplicationScheme, options =>
            {
                options.Cookie.HttpOnly = true;
                options.Cookie.SameSite = SameSiteMode.Lax;
                options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
                options.ExpireTimeSpan = TimeSpan.FromDays(14);
                options.SlidingExpiration = true;

                // This is a JSON API, not a page-based app - there is no server-rendered login
                // page to redirect to, so unauthenticated/forbidden requests must get a plain
                // status code instead of the cookie handler's default 302 redirect. The body
                // carries FSD section 80's Authentication Error text so a caller (once a
                // frontend sign-in flow exists to display it) knows why access was denied.
                // Missing, invalid and expired cookies all reach this same handler and get the
                // same message - the FSD defines only one Authentication Error example, and
                // collapsing the causes matches the anti-enumeration precedent already used for
                // login failures in CredentialLoginService.
                options.Events.OnRedirectToLogin = async context =>
                {
                    context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                    await context.Response.WriteAsJsonAsync(new ProblemDetails
                    {
                        Status = StatusCodes.Status401Unauthorized,
                        Title = "Unauthorized.",
                        Detail = "Your session has expired. Please sign in again.",
                        Extensions = { ["correlationId"] = context.HttpContext.TraceIdentifier },
                    });
                };
                options.Events.OnRedirectToAccessDenied = context =>
                {
                    context.Response.StatusCode = StatusCodes.Status403Forbidden;
                    return Task.CompletedTask;
                };

                // Re-checks the account on every authenticated request, not only at sign-in - the
                // only way a *pre-existing* cookie (issued before the account was deleted, e.g. a
                // second browser tab) also stops working once the account is deleted (IG-102:
                // "deleted access is rejected"), since AccountDeletionService only signs out the
                // session that performed the deletion itself. This is the same problem ASP.NET
                // Core Identity's own SecurityStampValidator solves for password changes, which
                // isn't wired up here since this project uses AddIdentityCore rather than the
                // all-in-one AddIdentity (see AuthenticationTestHarness's comment on why).
                options.Events.OnValidatePrincipal = async context =>
                {
                    var userIdValue = context.Principal?.FindFirstValue(ClaimTypes.NameIdentifier);
                    var userManager = context.HttpContext.RequestServices.GetRequiredService<UserManager<ApplicationUser>>();
                    var user = userIdValue is not null ? await userManager.FindByIdAsync(userIdValue) : null;

                    if (user is null || user.Status != "Active")
                    {
                        context.RejectPrincipal();
                        await context.HttpContext.SignOutAsync(IdentityConstants.ApplicationScheme);
                    }
                };
            })
            // Short-lived bridge cookie that only holds Google's claims between the redirect back
            // from Google and ExternalLoginService finishing sign-in - 5 minutes matches ASP.NET
            // Core Identity's own default for this exact scheme (set internally by the full
            // AddIdentity() helper, which this project doesn't use - see AuthenticationTestHarness's
            // comment on why). It must never live as long as the real session cookie above.
            .AddCookie(IdentityConstants.ExternalScheme, options =>
            {
                options.Cookie.HttpOnly = true;
                options.Cookie.SameSite = SameSiteMode.Lax;
                options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
                options.ExpireTimeSpan = TimeSpan.FromMinutes(5);
            })
            .AddGoogle(options =>
            {
                options.ClientId = googleOptions.ClientId;
                options.ClientSecret = googleOptions.ClientSecret;
                options.SignInScheme = IdentityConstants.ExternalScheme;
                // Matches the redirect URI registered in Google Cloud Console; explicit here even
                // though it's also the library default, so the two stay obviously in sync.
                options.CallbackPath = "/signin-google";

                // Not mapped by default - AuthEndpoints/ExternalLoginService need it to decide
                // whether a matching-email existing account may be auto-linked (IG-23: "does not
                // create duplicate accounts for the same verified identity").
                options.ClaimActions.MapJsonKey("email_verified", "email_verified");

                options.Events.OnRemoteFailure = context =>
                {
                    // Covers both a user cancelling Google's consent screen and a genuine
                    // provider failure (IG-94). HandleResponse stops the default behavior, which
                    // is to throw and surface a raw 500 with the provider's own error text - the
                    // client only ever sees AuthEndpoints' generic, client-safe message instead.
                    context.HandleResponse();
                    context.Response.Redirect("/api/v1/auth/google/callback?error=remote_failure");
                    return Task.CompletedTask;
                };
            });

        services.AddAuthorization();

        services.AddScoped<IAccountRegistrationService, AccountRegistrationService>();
        services.AddScoped<IAuthSessionService, AuthSessionService>();
        services.AddScoped<ICredentialLoginService, CredentialLoginService>();
        services.AddScoped<IAccountDeletionService, AccountDeletionService>();
        services.AddScoped<IExternalLoginService, ExternalLoginService>();

        return services;
    }
}
