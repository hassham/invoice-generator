using System.Net;
using System.Text.Json;

namespace InvoiceApp.Api.Tests.Authentication;

/// <summary>
/// IG-295 / IG-296: invoices and customers are scoped to a business, so their routes need the
/// business id. Tests that exercise a single account's own data use that account's default
/// business (the one created at registration, which the legacy /api/v1/business route returns).
/// </summary>
public static class DefaultBusinessRoutes
{
    public static async Task<string> InvoicesRouteAsync(HttpClient client) =>
        $"/api/v1/businesses/{await DefaultBusinessIdAsync(client)}/invoices";

    public static async Task<string> CustomersRouteAsync(HttpClient client) =>
        $"/api/v1/businesses/{await DefaultBusinessIdAsync(client)}/customers";

    /// <summary>Any business-scoped route under the default business, e.g. suffix "/items".</summary>
    public static async Task<string> RouteAsync(HttpClient client, string suffix) =>
        $"/api/v1/businesses/{await DefaultBusinessIdAsync(client)}{suffix}";

    public static async Task<Guid> DefaultBusinessIdAsync(HttpClient client)
    {
        using var response = await client.GetAsync("/api/v1/business");

        // No session: every business-scoped route answers 401 before it looks at the id, so an unknown
        // id keeps the unauthenticated tests exercising authentication rather than this lookup.
        if (response.StatusCode == HttpStatusCode.Unauthorized)
        {
            return Guid.NewGuid();
        }

        response.EnsureSuccessStatusCode();
        using var business = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync());
        return business.RootElement.GetProperty("id").GetGuid();
    }
}
