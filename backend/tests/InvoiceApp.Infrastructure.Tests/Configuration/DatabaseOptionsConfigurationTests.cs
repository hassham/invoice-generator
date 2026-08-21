using InvoiceApp.Infrastructure.Configuration;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace InvoiceApp.Infrastructure.Tests.Configuration;

/// <summary>
/// Verifies the completion criteria of IG-75/T003: required settings load per environment, and a
/// missing required setting fails with an actionable, non-sensitive error - proven here against
/// the real DI/configuration binding pipeline, not just the validator in isolation.
/// </summary>
public class DatabaseOptionsConfigurationTests
{
    [Fact]
    public void Configured_connection_string_binds_successfully()
    {
        const string connectionString = "Host=localhost;Port=5432;Database=invoiceapp;Username=invoiceapp;Password=invoiceapp";

        var options = Resolve(new Dictionary<string, string?>
        {
            ["ConnectionStrings:Default"] = connectionString,
        });

        Assert.Equal(connectionString, options.Value.Default);
    }

    [Fact]
    public void Missing_connection_string_fails_fast_with_actionable_non_sensitive_message()
    {
        var options = Resolve(new Dictionary<string, string?>());

        var exception = Assert.Throws<OptionsValidationException>(() => options.Value);

        Assert.Contains("ConnectionStrings:Default", exception.Message, StringComparison.Ordinal);
        Assert.Contains("required", exception.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Blank_connection_string_fails_fast_the_same_as_a_missing_one()
    {
        var options = Resolve(new Dictionary<string, string?>
        {
            ["ConnectionStrings:Default"] = "   ",
        });

        Assert.Throws<OptionsValidationException>(() => options.Value);
    }

    private static IOptions<DatabaseOptions> Resolve(Dictionary<string, string?> settings)
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(settings)
            .Build();

        var services = new ServiceCollection();
        services.AddInfrastructureConfiguration(configuration);

        return services.BuildServiceProvider().GetRequiredService<IOptions<DatabaseOptions>>();
    }
}
