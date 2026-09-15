using InvoiceApp.Application.Payments;
using InvoiceApp.Infrastructure.Configuration;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace InvoiceApp.Infrastructure.Payments;

public static class PaymentsServiceCollectionExtensions
{
    public static IServiceCollection AddInfrastructurePayments(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddScoped<IPaymentService, PaymentService>();

        // IG-219: same "optional, blank by default" precedent as SmtpOptions/GoogleAuthenticationOptions.
        services.Configure<StripeOptions>(configuration.GetSection(StripeOptions.SectionName));
        services.AddScoped<IStripeConnectService, StripeConnectService>();

        return services;
    }
}
