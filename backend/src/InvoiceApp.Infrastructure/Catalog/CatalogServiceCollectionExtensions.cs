using InvoiceApp.Application.Catalog;
using Microsoft.Extensions.DependencyInjection;

namespace InvoiceApp.Infrastructure.Catalog;

public static class CatalogServiceCollectionExtensions
{
    public static IServiceCollection AddInfrastructureCatalog(this IServiceCollection services)
    {
        services.AddScoped<ICatalogItemService, CatalogItemService>();
        return services;
    }
}
