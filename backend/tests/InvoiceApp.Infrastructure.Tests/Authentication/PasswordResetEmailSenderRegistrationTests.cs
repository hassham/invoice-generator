using InvoiceApp.Application.Identity;
using InvoiceApp.Infrastructure.Authentication;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace InvoiceApp.Infrastructure.Tests.Authentication;

/// <summary>
/// Confirms AddInfrastructureAuthentication's conditional real-vs-stub email sender selection
/// (InfrastructureAuthenticationExtensions), the same way DatabaseOptionsConfigurationTests proves
/// config-driven DI wiring against the real container rather than just reading the source.
/// SmtpPasswordResetEmailSender's actual SendAsync isn't exercised here - real delivery can only
/// be proven against a real SMTP provider, per backend/README.md's Secrets section.
/// </summary>
public class PasswordResetEmailSenderRegistrationTests
{
    [Fact]
    public void No_email_host_configured_falls_back_to_the_dev_only_logging_sender()
    {
        var sender = Resolve(new Dictionary<string, string?>());

        Assert.IsType<LoggingPasswordResetEmailSender>(sender);
    }

    [Fact]
    public void Blank_email_host_falls_back_to_the_dev_only_logging_sender()
    {
        var sender = Resolve(new Dictionary<string, string?>
        {
            ["Email:Host"] = "   ",
        });

        Assert.IsType<LoggingPasswordResetEmailSender>(sender);
    }

    [Fact]
    public void Configured_email_host_selects_the_real_smtp_sender()
    {
        var sender = Resolve(new Dictionary<string, string?>
        {
            ["Email:Host"] = "smtp.example.com",
        });

        Assert.IsType<SmtpPasswordResetEmailSender>(sender);
    }

    private static IPasswordResetEmailSender Resolve(Dictionary<string, string?> settings)
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(settings)
            .Build();

        var services = new ServiceCollection();
        services.AddSingleton<IConfiguration>(configuration);
        services.AddLogging();
        services.AddInfrastructureAuthentication(configuration);

        return services.BuildServiceProvider().GetRequiredService<IPasswordResetEmailSender>();
    }
}
