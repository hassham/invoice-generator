using InvoiceApp.Application.Invoicing;
using Microsoft.Extensions.DependencyInjection;

namespace InvoiceApp.Infrastructure.Invoicing;

public static class InvoicingServiceCollectionExtensions
{
    public static IServiceCollection AddInfrastructureInvoicing(this IServiceCollection services)
    {
        services.AddScoped<IInvoiceService, InvoiceService>();
        services.AddScoped<IRecurringScheduleService, RecurringScheduleService>();
        return services;
    }
}
