using InvoiceApp.Application.Payments;
using Microsoft.Extensions.DependencyInjection;

namespace InvoiceApp.Infrastructure.Payments;

public static class PaymentsServiceCollectionExtensions
{
    public static IServiceCollection AddInfrastructurePayments(this IServiceCollection services)
    {
        services.AddScoped<IPaymentService, PaymentService>();
        return services;
    }
}
