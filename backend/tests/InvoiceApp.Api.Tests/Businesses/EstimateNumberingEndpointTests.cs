using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using InvoiceApp.Api.Tests.Authentication;
using InvoiceApp.Application.Businesses;
using InvoiceApp.Application.Identity;
using InvoiceApp.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace InvoiceApp.Api.Tests.Businesses;

/// <summary>
/// IG-220: mirrors BusinessEndpointsTests' own next-invoice-number numbering test exactly, for the
/// independent estimate sequence - GenerateNextEstimateNumberAsync issues the same
/// Postgres-specific UPDATE...RETURNING raw SQL the InMemory provider can't execute, so this needs
/// a real Npgsql connection too. Skips (not fails) when Postgres isn't reachable, same reasoning.
/// No Business Settings UI/BusinessProfileRequest field exists to customize EstimatePrefix/
/// NextEstimateNumber yet (out of this Story's scope) - this asserts the domain defaults
/// ("EST-"/1/4) generate correctly and increment atomically instead.
/// </summary>
public class EstimateNumberingEndpointTests
{
    private const string BusinessEndpoint = "/api/v1/business";

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };

    private const string PostgresConnectionString = "Host=localhost;Port=5433;Database=invoiceapp;Username=invoiceapp;Password=invoiceapp";

    private static async Task<bool> PostgresIsAvailableAsync()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseNpgsql(PostgresConnectionString)
            .UseSnakeCaseNamingConvention()
            .Options;
        try
        {
            await using var context = new ApplicationDbContext(options);
            return await context.Database.CanConnectAsync();
        }
        catch
        {
            return false;
        }
    }

    private static async Task CleanupPostgresTestAccountAsync(string email)
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseNpgsql(PostgresConnectionString)
            .UseSnakeCaseNamingConvention()
            .Options;
        await using var context = new ApplicationDbContext(options);

        var user = await context.Users.SingleOrDefaultAsync(u => u.Email == email);
        if (user is null)
        {
            return;
        }

        var business = await context.Businesses.SingleOrDefaultAsync(b => b.UserId == user.Id);
        if (business is not null)
        {
            context.Businesses.Remove(business);
        }

        context.Users.Remove(user);
        await context.SaveChangesAsync();
    }

    private static async Task<HttpClient> RegisteredClientAsync(AuthenticatedRouteTestFactory factory, string email)
    {
        var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/v1/auth/register", new RegisterAccountRequest(email, "Password1", "Password1", null));
        response.EnsureSuccessStatusCode();
        return client;
    }

    [SkippableFact]
    public async Task Generates_a_formatted_next_estimate_number_and_increments_it_independently_of_invoices()
    {
        Skip.IfNot(
            await PostgresIsAvailableAsync(),
            $"Postgres is not reachable at '{PostgresConnectionString}' - start the invoiceapp-postgres docker container to run this test.");

        var email = $"estimate-numbering-{Guid.NewGuid():N}@example.com";
        using var factory = new AuthenticatedRouteTestFactory(postgresConnectionStringOverride: PostgresConnectionString);
        try
        {
            using var client = await RegisteredClientAsync(factory, email);

            var firstEstimate = await client.PostAsync($"{BusinessEndpoint}/next-estimate-number", null);
            var secondEstimate = await client.PostAsync($"{BusinessEndpoint}/next-estimate-number", null);
            var firstInvoice = await client.PostAsync($"{BusinessEndpoint}/next-invoice-number", null);

            Assert.Equal(HttpStatusCode.OK, firstEstimate.StatusCode);
            var firstEstimateGenerated = await firstEstimate.Content.ReadFromJsonAsync<GeneratedEstimateNumberDto>(JsonOptions);
            var secondEstimateGenerated = await secondEstimate.Content.ReadFromJsonAsync<GeneratedEstimateNumberDto>(JsonOptions);
            var firstInvoiceGenerated = await firstInvoice.Content.ReadFromJsonAsync<GeneratedInvoiceNumberDto>(JsonOptions);

            Assert.Equal("EST-0001", firstEstimateGenerated!.EstimateNumber);
            Assert.Equal("EST-0002", secondEstimateGenerated!.EstimateNumber);
            // Proves the two sequences are genuinely independent counters, not accidentally sharing
            // one column - the invoice sequence starts fresh at 1 regardless of estimate calls made.
            Assert.Equal("INV-0001", firstInvoiceGenerated!.InvoiceNumber);
        }
        finally
        {
            await CleanupPostgresTestAccountAsync(email);
        }
    }

    [Fact]
    public async Task Missing_session_cannot_generate_a_next_estimate_number()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var anonymousClient = factory.CreateClient();

        var response = await anonymousClient.PostAsync($"{BusinessEndpoint}/next-estimate-number", null);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
