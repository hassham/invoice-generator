using InvoiceApp.Application.Email;
using InvoiceApp.Infrastructure.Configuration;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace InvoiceApp.Infrastructure.Email;

public static class InfrastructureEmailExtensions
{
    public static IServiceCollection AddInfrastructureEmail(this IServiceCollection services, IConfiguration configuration)
    {
        // SmtpOptions is also configured by AddInfrastructureAuthentication (for the
        // password-reset sender) - registering it again here is a harmless no-op duplicate
        // binding, kept so this extension stays self-contained rather than implicitly depending
        // on registration order elsewhere in Program.cs.
        var smtpOptions = configuration.GetSection(SmtpOptions.SectionName).Get<SmtpOptions>() ?? new SmtpOptions();
        services.Configure<SmtpOptions>(configuration.GetSection(SmtpOptions.SectionName));

        // Same "real delivery only once actually configured" precedent as
        // InfrastructureAuthenticationExtensions - every environment without real credentials
        // (local dev, CI, tests) keeps using the dev-only log stub unchanged.
        if (!string.IsNullOrWhiteSpace(smtpOptions.Host))
        {
            services.AddScoped<IEmailSender, SmtpEmailSender>();
        }
        else
        {
            services.AddScoped<IEmailSender, LoggingEmailSender>();
        }

        return services;
    }
}
