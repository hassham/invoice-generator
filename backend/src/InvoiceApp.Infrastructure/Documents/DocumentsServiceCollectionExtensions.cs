using InvoiceApp.Application.Documents;
using Microsoft.Extensions.DependencyInjection;

namespace InvoiceApp.Infrastructure.Documents;

public static class DocumentsServiceCollectionExtensions
{
    public static IServiceCollection AddInfrastructureDocuments(this IServiceCollection services)
    {
        services.AddScoped<IDocumentListService, DocumentListService>();
        return services;
    }
}
