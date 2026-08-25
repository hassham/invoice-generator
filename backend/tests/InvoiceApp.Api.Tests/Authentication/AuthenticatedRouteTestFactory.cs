using InvoiceApp.Infrastructure.Configuration;
using InvoiceApp.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace InvoiceApp.Api.Tests.Authentication;

/// <summary>
/// Hosts the real Api pipeline (real cookie authentication middleware, real endpoint
/// authorization metadata, real rate limiter) in-process, swapping only the database for EF
/// Core's InMemory provider - mirrors AuthenticationTestHarness's InMemory approach, but at the
/// HTTP level, which is the only way to prove IG-99's actual completion criterion: protected
/// *routes* (not just the underlying service methods) reject missing/invalid/expired sessions.
/// </summary>
public sealed class AuthenticatedRouteTestFactory : WebApplicationFactory<Program>
{
    private readonly string _databaseName = Guid.NewGuid().ToString();
    private readonly TimeSpan? _cookieExpireOverride;
    private readonly int? _rateLimitPermitLimitOverride;

    public AuthenticatedRouteTestFactory(
        TimeSpan? cookieExpireOverride = null,
        int? rateLimitPermitLimitOverride = null)
    {
        _cookieExpireOverride = cookieExpireOverride;
        _rateLimitPermitLimitOverride = rateLimitPermitLimitOverride;
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<DbContextOptions<ApplicationDbContext>>();
            services.AddDbContext<ApplicationDbContext>(options =>
                options.UseInMemoryDatabase(_databaseName));

            // No real Authentication:Google:ClientId/Secret exists in the test environment, but
            // GoogleOptions requires non-empty values before it will build a challenge redirect
            // at all - dummy values are enough to prove the redirect shape without ever actually
            // contacting Google.
            services.PostConfigure<GoogleOptions>(GoogleDefaults.AuthenticationScheme, options =>
            {
                options.ClientId = "test-client-id";
                options.ClientSecret = "test-client-secret";
            });

            if (_cookieExpireOverride is { } expireOverride)
            {
                // PostConfigure (not Configure) so this reliably wins over the
                // AddCookie(...) options set in InfrastructureAuthenticationExtensions,
                // regardless of DI registration order.
                services.PostConfigure<CookieAuthenticationOptions>(IdentityConstants.ApplicationScheme, options =>
                {
                    options.ExpireTimeSpan = expireOverride;
                    options.SlidingExpiration = false;
                });
            }

            if (_rateLimitPermitLimitOverride is { } permitLimitOverride)
            {
                // PostConfigure so this reliably wins regardless of DI registration order, same
                // reasoning as the cookie-expiry override above. Lets rate-limit tests use a
                // small, deterministic threshold instead of the real configured default, so they
                // don't need to fire dozens of requests to trip it.
                services.PostConfigure<RateLimitingOptions>(options =>
                {
                    options.PermitLimit = permitLimitOverride;
                });
            }
        });
    }
}
