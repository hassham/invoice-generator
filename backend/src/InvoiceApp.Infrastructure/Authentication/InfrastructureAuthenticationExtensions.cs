using InvoiceApp.Application.Identity;
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
            });

        services.AddAuthorization();

        services.AddScoped<IAccountRegistrationService, AccountRegistrationService>();
        services.AddScoped<IAuthSessionService, AuthSessionService>();
        services.AddScoped<ICredentialLoginService, CredentialLoginService>();

        return services;
    }
}
