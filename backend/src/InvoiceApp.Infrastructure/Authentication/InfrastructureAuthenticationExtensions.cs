using System.Security.Claims;
using InvoiceApp.Application.Identity;
using InvoiceApp.Infrastructure.Identity;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;

namespace InvoiceApp.Infrastructure.Authentication;

public static class InfrastructureAuthenticationExtensions
{
    public static IServiceCollection AddInfrastructureAuthentication(this IServiceCollection services)
    {
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
            });

        services.AddAuthorization();

        services.AddScoped<IAccountRegistrationService, AccountRegistrationService>();
        services.AddScoped<IAuthSessionService, AuthSessionService>();
        services.AddScoped<ICredentialLoginService, CredentialLoginService>();
        services.AddScoped<IAccountDeletionService, AccountDeletionService>();

        return services;
    }
}
