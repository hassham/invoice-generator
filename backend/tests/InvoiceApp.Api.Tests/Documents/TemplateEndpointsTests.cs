using System.Net;
using System.Net.Http.Json;
using InvoiceApp.Api.Endpoints;
using InvoiceApp.Api.Tests.Authentication;
using InvoiceApp.Domain.Documents;
using InvoiceApp.Infrastructure.Persistence;
using Microsoft.Extensions.DependencyInjection;

namespace InvoiceApp.Api.Tests.Documents;

/// <summary>
/// Verifies GET /api/v1/templates at the real HTTP pipeline level: reachable without a session
/// (global reference data, needed by anonymous invoice creation per Epic IG-4) and excludes
/// inactive templates. EF Core's InMemory provider does not materialize a migration's HasData
/// seed the way the real relational provider does, so tests seed their own rows matching
/// migration 20260821044819_SeedTemplates's shape rather than relying on it being pre-populated.
/// </summary>
public class TemplateEndpointsTests
{
    private const string TemplatesEndpoint = "/api/v1/templates";

    private static async Task SeedLaunchTemplatesAsync(ApplicationDbContext db)
    {
        db.Templates.AddRange(
            new Template { Id = Guid.NewGuid(), Name = "Classic", TemplateCode = "classic", IsActive = true, SortOrder = 1 },
            new Template { Id = Guid.NewGuid(), Name = "Modern", TemplateCode = "modern", IsActive = true, SortOrder = 2 },
            new Template { Id = Guid.NewGuid(), Name = "Minimal", TemplateCode = "minimal", IsActive = true, SortOrder = 3 });
        await db.SaveChangesAsync();
    }

    [Fact]
    public async Task Returns_the_seeded_launch_templates_ordered_by_sort_order_without_requiring_a_session()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using (var scope = factory.Services.CreateScope())
        {
            await SeedLaunchTemplatesAsync(scope.ServiceProvider.GetRequiredService<ApplicationDbContext>());
        }
        using var client = factory.CreateClient();

        var response = await client.GetAsync(TemplatesEndpoint);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var templates = await response.Content.ReadFromJsonAsync<List<TemplateResponse>>();
        Assert.NotNull(templates);
        Assert.Equal(3, templates!.Count);
        Assert.Equal(["Classic", "Modern", "Minimal"], templates.Select(t => t.Name));
        Assert.All(templates, t => Assert.False(t.IsPremium));
    }

    [Fact]
    public async Task Excludes_inactive_templates()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            await SeedLaunchTemplatesAsync(db);
            db.Templates.Add(new Template
            {
                Id = Guid.NewGuid(),
                Name = "Retired",
                TemplateCode = "retired",
                IsActive = false,
                SortOrder = 99,
            });
            await db.SaveChangesAsync();
        }
        using var client = factory.CreateClient();

        var response = await client.GetAsync(TemplatesEndpoint);

        var templates = await response.Content.ReadFromJsonAsync<List<TemplateResponse>>();
        Assert.Equal(3, templates!.Count);
        Assert.DoesNotContain(templates, t => t.TemplateCode == "retired");
    }
}
