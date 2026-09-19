using InvoiceApp.Application.Estimates;
using Microsoft.Extensions.DependencyInjection;

namespace InvoiceApp.Infrastructure.Estimates;

public static class EstimatesServiceCollectionExtensions
{
    public static IServiceCollection AddInfrastructureEstimates(this IServiceCollection services)
    {
        services.AddScoped<IEstimateService, EstimateService>();
        return services;
    }
}
