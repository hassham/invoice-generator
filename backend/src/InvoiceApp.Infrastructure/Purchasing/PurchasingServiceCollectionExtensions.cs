using InvoiceApp.Application.Purchasing;
using Microsoft.Extensions.DependencyInjection;

namespace InvoiceApp.Infrastructure.Purchasing;

public static class PurchasingServiceCollectionExtensions
{
    public static IServiceCollection AddInfrastructurePurchasing(this IServiceCollection services)
    {
        services.AddScoped<IPurchaseOrderService, PurchaseOrderService>();
        return services;
    }
}
