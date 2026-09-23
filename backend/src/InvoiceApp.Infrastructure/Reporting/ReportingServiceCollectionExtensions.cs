using InvoiceApp.Application.Reporting;
using Microsoft.Extensions.DependencyInjection;

namespace InvoiceApp.Infrastructure.Reporting;

public static class ReportingServiceCollectionExtensions
{
    public static IServiceCollection AddReportingServices(this IServiceCollection services)
    {
        services.AddScoped<IReportingService, ReportingService>();
        return services;
    }
}
