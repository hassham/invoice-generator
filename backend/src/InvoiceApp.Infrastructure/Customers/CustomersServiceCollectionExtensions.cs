using InvoiceApp.Application.Customers;
using Microsoft.Extensions.DependencyInjection;

namespace InvoiceApp.Infrastructure.Customers;

public static class CustomersServiceCollectionExtensions
{
    public static IServiceCollection AddInfrastructureCustomers(this IServiceCollection services)
    {
        services.AddScoped<ICustomerService, CustomerService>();
        return services;
    }
}
