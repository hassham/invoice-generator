using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Options;

namespace InvoiceApp.Infrastructure.Configuration;

/// <summary>
/// Binds and validates Infrastructure-owned configuration sections (docs/SAD.md section 67-68).
/// Each option type is registered with ValidateOnStart so a missing required setting fails fast
/// at host startup with an actionable message, instead of failing later or running with a silent
/// default. New provider-specific option types (Storage, Email, Payments, Authentication) should
/// follow this same pattern when their owning modules are implemented.
/// </summary>
public static class InfrastructureConfigurationExtensions
{
    public static IServiceCollection AddInfrastructureConfiguration(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.TryAddSingleton(configuration);

        services.AddSingleton<IValidateOptions<DatabaseOptions>, DatabaseOptionsValidator>();
        services.AddOptions<DatabaseOptions>()
            .BindConfiguration(DatabaseOptions.SectionName)
            .ValidateOnStart();

        return services;
    }
}
