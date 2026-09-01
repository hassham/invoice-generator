using InvoiceApp.Application.Audit;
using Microsoft.Extensions.DependencyInjection;

namespace InvoiceApp.Infrastructure.Audit;

public static class AuditServiceCollectionExtensions
{
    public static IServiceCollection AddInfrastructureAudit(this IServiceCollection services)
    {
        services.AddScoped<IAuditLogService, AuditLogService>();
        return services;
    }
}
