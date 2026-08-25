using InvoiceApp.Infrastructure.Configuration;
using InvoiceApp.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace InvoiceApp.Infrastructure.Persistence;

public static class PersistenceServiceCollectionExtensions
{
    public static IServiceCollection AddInfrastructurePersistence(this IServiceCollection services)
    {
        services.AddDbContext<ApplicationDbContext>((provider, options) =>
        {
            var connectionString = provider.GetRequiredService<IOptions<DatabaseOptions>>().Value.Default;
            options.UseNpgsql(connectionString).UseSnakeCaseNamingConvention();
        });

        services
            .AddIdentityCore<ApplicationUser>(options =>
            {
                // FSD 7.1 password rules exactly - Identity's own defaults are stricter
                // (require a non-alphanumeric character), which would reject FSD-valid
                // passwords, so every rule is set explicitly rather than left at default.
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

        // Password-reset tokens (UserManager.GeneratePasswordResetTokenAsync/ResetPasswordAsync)
        // use the "Default" DataProtectorTokenProvider registered above - its default 1-day
        // lifespan is longer than a reset link should stay valid, so it's shortened explicitly
        // here to satisfy FSD 9's "expire after a defined duration" requirement.
        services.Configure<DataProtectionTokenProviderOptions>(options =>
        {
            options.TokenLifespan = TimeSpan.FromHours(1);
        });

        return services;
    }
}
