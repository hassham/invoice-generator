using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using InvoiceApp.Api.Tests.Authentication;
using InvoiceApp.Application.Businesses;
using InvoiceApp.Application.Identity;
using InvoiceApp.Application.Invoicing;
using InvoiceApp.Domain.Businesses;
using InvoiceApp.Domain.Invoicing;
using InvoiceApp.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace InvoiceApp.Api.Tests.Businesses;

/// <summary>
/// IG-296: the same business-isolation rules as BusinessScopedInvoicesAndCustomersTests, run against
/// the real PostgreSQL database rather than EF's in-memory provider. The in-memory provider does not
/// enforce unique indexes, so only this proves that invoice numbers are unique per business rather
/// than per account. Skips (does not fail) when the local invoiceapp-postgres container is down.
/// </summary>
public class BusinessScopedPostgresTests
{
    private const string PostgresConnectionString = "Host=localhost;Port=5433;Database=invoiceapp;Username=invoiceapp;Password=invoiceapp";

    // Asks the database directly. An HTTP probe (e.g. /api/v1/auth/me) answers anonymous callers
    // without touching the database, so it wrongly reports Postgres as available on CI, which has
    // no database container, and the tests then fail with a 500 on registration.
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

    private static async Task<HttpClient> RegisteredClientAsync(AuthenticatedRouteTestFactory factory, string email)
    {
        var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/v1/auth/register", new RegisterAccountRequest(email, "Password1", "Password1", null));
        response.EnsureSuccessStatusCode();
        return client;
    }

    private static async Task<Guid> DefaultBusinessIdAsync(HttpClient client) =>
        await DefaultBusinessRoutes.DefaultBusinessIdAsync(client);

    private static async Task<Guid> CreateBusinessAsync(HttpClient client, string name)
    {
        var response = await client.PostAsJsonAsync("/api/v1/businesses", new CreateBusinessRequest(name, "AU", "AUD"));
        response.EnsureSuccessStatusCode();
        using var body = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync());
        return body.RootElement.GetProperty("id").GetGuid();
    }

    private static InvoiceSaveRequest ValidInvoice(string invoiceNumber) => new(
        InvoiceNumber: invoiceNumber,
        IssueDate: new DateOnly(2030, 1, 1),
        DueDate: new DateOnly(2030, 1, 15),
        Reference: null,
        Currency: "AUD",
        Seller: "Seller",
        Customer: "Acme Pty Ltd",
        ShipTo: null,
        Items: [new InvoiceSaveLineItem("Consulting", 1, null, 100, 0, 0)],
        InvoiceDiscountType: DiscountType.None,
        InvoiceDiscountValue: null,
        TaxCalculationMethod: TaxCalculationMethod.Exclusive,
        Notes: null,
        Terms: null,
        CustomInstructions: null,
        PaymentInstructions: null,
        TemplateId: null,
        TemplateCustomization: null);

    private static async Task<List<Guid>> InvoiceIdsAsync(HttpClient client, Guid businessId)
    {
        var response = await client.GetAsync($"/api/v1/businesses/{businessId}/invoices");
        response.EnsureSuccessStatusCode();
        using var body = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync());
        return body.RootElement.GetProperty("items").EnumerateArray().Select(item => item.GetProperty("id").GetGuid()).ToList();
    }

    [SkippableFact]
    public async Task The_same_invoice_number_can_exist_in_two_businesses_of_one_account_on_postgres()
    {
        Skip.IfNot(
            await PostgresIsAvailableAsync(),
            $"Postgres is not reachable at '{PostgresConnectionString}' - start the invoiceapp-postgres docker container to run this test.");

        var email = $"scope-pg-numbers-{Guid.NewGuid():N}@example.com";
        using var factory = new AuthenticatedRouteTestFactory(postgresConnectionStringOverride: PostgresConnectionString);
        using var client = await RegisteredClientAsync(factory, email);
        try
        {
            var defaultBusinessId = await DefaultBusinessIdAsync(client);
            var secondBusinessId = await CreateBusinessAsync(client, "Second Co");

            var inDefault = await client.PostAsJsonAsync($"/api/v1/businesses/{defaultBusinessId}/invoices", ValidInvoice("INV-0001"));
            var inSecond = await client.PostAsJsonAsync($"/api/v1/businesses/{secondBusinessId}/invoices", ValidInvoice("INV-0001"));

            Assert.Equal(HttpStatusCode.Created, inDefault.StatusCode);
            Assert.Equal(HttpStatusCode.Created, inSecond.StatusCode);

            var defaultIds = await InvoiceIdsAsync(client, defaultBusinessId);
            var secondIds = await InvoiceIdsAsync(client, secondBusinessId);
            Assert.Single(defaultIds);
            Assert.Single(secondIds);
            Assert.NotEqual(defaultIds[0], secondIds[0]);
        }
        finally
        {
            await client.SendAsync(new HttpRequestMessage(HttpMethod.Delete, "/api/v1/auth/account")
            {
                Content = JsonContent.Create(new DeleteAccountRequest("Password1")),
            });
        }
    }

    [SkippableFact]
    public async Task A_duplicate_invoice_number_within_one_business_is_still_rejected_on_postgres()
    {
        Skip.IfNot(
            await PostgresIsAvailableAsync(),
            $"Postgres is not reachable at '{PostgresConnectionString}' - start the invoiceapp-postgres docker container to run this test.");

        var email = $"scope-pg-dup-{Guid.NewGuid():N}@example.com";
        using var factory = new AuthenticatedRouteTestFactory(postgresConnectionStringOverride: PostgresConnectionString);
        using var client = await RegisteredClientAsync(factory, email);
        try
        {
            var secondBusinessId = await CreateBusinessAsync(client, "Second Co");
            var first = await client.PostAsJsonAsync($"/api/v1/businesses/{secondBusinessId}/invoices", ValidInvoice("INV-0001"));
            var second = await client.PostAsJsonAsync($"/api/v1/businesses/{secondBusinessId}/invoices", ValidInvoice("INV-0001"));

            Assert.Equal(HttpStatusCode.Created, first.StatusCode);
            Assert.NotEqual(HttpStatusCode.Created, second.StatusCode);
        }
        finally
        {
            await client.SendAsync(new HttpRequestMessage(HttpMethod.Delete, "/api/v1/auth/account")
            {
                Content = JsonContent.Create(new DeleteAccountRequest("Password1")),
            });
        }
    }
}
