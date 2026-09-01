using InvoiceApp.Application.Businesses;
using Microsoft.Extensions.DependencyInjection;

namespace InvoiceApp.Infrastructure.Businesses;

public static class BusinessesServiceCollectionExtensions
{
    public static IServiceCollection AddInfrastructureBusinesses(this IServiceCollection services)
    {
        services.AddScoped<IBusinessService, BusinessService>();
        return services;
    }
}
