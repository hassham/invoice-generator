using InvoiceApp.Application.Identity;
using InvoiceApp.Infrastructure.Authentication;
using InvoiceApp.Infrastructure.Identity;
using InvoiceApp.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace InvoiceApp.Infrastructure.Tests.Authentication;

/// <summary>
/// Builds a real Identity + EF Core stack (UserManager, SignInManager, ApplicationDbContext)
/// against EF Core's InMemory provider, mirroring the production DI wiring in
/// PersistenceServiceCollectionExtensions/InfrastructureAuthenticationExtensions minus Npgsql.
/// This exercises Identity's real validators (password rules, unique-email) instead of mocking
/// them, at the cost of not testing transaction behavior - InMemory doesn't support real
/// transactions, which is exactly what AccountRegistrationService.IsRelational() guards against.
/// </summary>
public sealed class AuthenticationTestHarness : IDisposable
{
    public AuthenticationTestHarness()
    {
        var services = new ServiceCollection();

        services.AddDbContext<ApplicationDbContext>(options =>
            options.UseInMemoryDatabase(Guid.NewGuid().ToString()));

        services
            .AddIdentityCore<ApplicationUser>(options =>
            {
                options.Password.RequiredLength = 8;
                options.Password.RequireUppercase = true;
                options.Password.RequireLowercase = true;
                options.Password.RequireDigit = true;
                options.Password.RequireNonAlphanumeric = false;
                options.Password.RequiredUniqueChars = 1;
                options.User.RequireUniqueEmail = true;
            })
            .AddRoles<IdentityRole<Guid>>()
            .AddSignInManager()
            .AddEntityFrameworkStores<ApplicationDbContext>()
            .AddDefaultTokenProviders();

        services.AddInfrastructureAuthentication();

        Provider = services.BuildServiceProvider();
        Scope = Provider.CreateScope();
    }

    private IServiceProvider Provider { get; }

    private IServiceScope Scope { get; }

    public ApplicationDbContext DbContext => Scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

    public UserManager<ApplicationUser> UserManager => Scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();

    public IAccountRegistrationService AccountRegistrationService => Scope.ServiceProvider.GetRequiredService<IAccountRegistrationService>();

    public IAuthSessionService BuildAuthSessionService(Microsoft.AspNetCore.Http.HttpContext httpContext)
    {
        AttachHttpContext(httpContext);
        return Scope.ServiceProvider.GetRequiredService<IAuthSessionService>();
    }

    public ICredentialLoginService BuildCredentialLoginService(Microsoft.AspNetCore.Http.HttpContext httpContext)
    {
        AttachHttpContext(httpContext);
        return Scope.ServiceProvider.GetRequiredService<ICredentialLoginService>();
    }

    public IAccountDeletionService BuildAccountDeletionService(Microsoft.AspNetCore.Http.HttpContext httpContext)
    {
        AttachHttpContext(httpContext);
        return Scope.ServiceProvider.GetRequiredService<IAccountDeletionService>();
    }

    private void AttachHttpContext(Microsoft.AspNetCore.Http.HttpContext httpContext)
    {
        // SignInManager resolves IAuthenticationService etc. from HttpContext.RequestServices,
        // not from its own constructor-injected provider - a bare DefaultHttpContext has none.
        httpContext.RequestServices = Scope.ServiceProvider;
        Scope.ServiceProvider.GetRequiredService<SignInManager<ApplicationUser>>().Context = httpContext;

        // AccountDeletionService reads the request IP for its audit record via
        // IHttpContextAccessor, not a constructor-injected HttpContext - nothing else in this
        // harness sets it, so without this line it would always see IpAddress = null.
        Scope.ServiceProvider.GetRequiredService<Microsoft.AspNetCore.Http.IHttpContextAccessor>().HttpContext = httpContext;
    }

    public void Dispose()
    {
        Scope.Dispose();
        (Provider as IDisposable)?.Dispose();
    }
}
