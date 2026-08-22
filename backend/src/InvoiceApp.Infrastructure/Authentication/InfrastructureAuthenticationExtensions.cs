using InvoiceApp.Application.Identity;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
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
                // status code instead of the cookie handler's default 302 redirect.
                options.Events.OnRedirectToLogin = context =>
                {
                    context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                    return Task.CompletedTask;
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

        return services;
    }
}
