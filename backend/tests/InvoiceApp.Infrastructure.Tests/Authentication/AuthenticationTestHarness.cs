using InvoiceApp.Application.Identity;
using InvoiceApp.Infrastructure.Authentication;
using InvoiceApp.Infrastructure.Identity;
using InvoiceApp.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

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
    public AuthenticationTestHarness(TimeSpan? passwordResetTokenLifespanOverride = null)
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

        // No Authentication:Google section - fine, since nothing in this harness triggers the
        // Google scheme itself (its options are only validated lazily, on first real use).
        // ExternalLoginServiceTests exercises IExternalLoginService directly instead.
        services.AddInfrastructureAuthentication(new ConfigurationBuilder().Build());

        // Swaps out the real LoggingPasswordResetEmailSender registered above for a capturing
        // fake - tests need to read back the token that RequestResetAsync generated (to feed it
        // into a subsequent ResetPasswordAsync call), which a log line can't hand back.
        services.RemoveAll<IPasswordResetEmailSender>();
        services.AddSingleton<IPasswordResetEmailSender>(EmailSender);

        if (passwordResetTokenLifespanOverride is { } lifespan)
        {
            // Lets IG-98's expired-token test use a near-zero lifespan instead of the real 1-hour
            // default, so it can prove expiry deterministically (generate, delay past the
            // lifespan, then attempt reset) without waiting an hour.
            services.Configure<DataProtectionTokenProviderOptions>(options => options.TokenLifespan = lifespan);
        }

        Provider = services.BuildServiceProvider();
        Scope = Provider.CreateScope();
    }

    public FakePasswordResetEmailSender EmailSender { get; } = new();

    private IServiceProvider Provider { get; }

    private IServiceScope Scope { get; }

    public ApplicationDbContext DbContext => Scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

    public UserManager<ApplicationUser> UserManager => Scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();

    public IAccountRegistrationService AccountRegistrationService => Scope.ServiceProvider.GetRequiredService<IAccountRegistrationService>();

    public IPasswordResetService PasswordResetService => Scope.ServiceProvider.GetRequiredService<IPasswordResetService>();

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

    public IExternalLoginService BuildExternalLoginService(Microsoft.AspNetCore.Http.HttpContext httpContext)
    {
        AttachHttpContext(httpContext);
        return Scope.ServiceProvider.GetRequiredService<IExternalLoginService>();
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
