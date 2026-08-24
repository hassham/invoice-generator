using InvoiceApp.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace InvoiceApp.Api.Tests.Authentication;

/// <summary>
/// Hosts the real Api pipeline (real cookie authentication middleware, real endpoint
/// authorization metadata) in-process, swapping only the database for EF Core's InMemory
/// provider - mirrors AuthenticationTestHarness's InMemory approach, but at the HTTP level, which
/// is the only way to prove IG-99's actual completion criterion: protected *routes* (not just the
/// underlying service methods) reject missing/invalid/expired sessions.
/// </summary>
public sealed class AuthenticatedRouteTestFactory : WebApplicationFactory<Program>
{
    private readonly string _databaseName = Guid.NewGuid().ToString();
    private readonly TimeSpan? _cookieExpireOverride;

    public AuthenticatedRouteTestFactory(TimeSpan? cookieExpireOverride = null)
    {
        _cookieExpireOverride = cookieExpireOverride;
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<DbContextOptions<ApplicationDbContext>>();
            services.AddDbContext<ApplicationDbContext>(options =>
                options.UseInMemoryDatabase(_databaseName));

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
        });
    }
}
