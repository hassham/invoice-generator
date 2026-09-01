using InvoiceApp.Application.Dashboard;
using Microsoft.Extensions.DependencyInjection;

namespace InvoiceApp.Infrastructure.Dashboard;

public static class DashboardServiceCollectionExtensions
{
    public static IServiceCollection AddInfrastructureDashboard(this IServiceCollection services)
    {
        services.AddScoped<IDashboardService, DashboardService>();
        return services;
    }
}
