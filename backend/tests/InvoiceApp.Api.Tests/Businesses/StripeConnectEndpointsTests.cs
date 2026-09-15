using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using InvoiceApp.Api.Tests.Authentication;
using InvoiceApp.Application.Businesses;
using InvoiceApp.Application.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.WebUtilities;

namespace InvoiceApp.Api.Tests.Businesses;

/// <summary>Verifies IG-219's Stripe Connect OAuth flow at the real HTTP pipeline level - the
/// redirect-out shape, the anti-CSRF state cookie, the callback's success/failure handling
/// (network calls faked via AuthenticatedRouteTestFactory.StripeConnectService), and
/// connect/disconnect's effect on the Business row.</summary>
public class StripeConnectEndpointsTests
{
    private const string ConnectEndpoint = "/api/v1/business/stripe/connect";
    private const string CallbackEndpoint = "/api/v1/business/stripe/callback";
    private const string DisconnectEndpoint = "/api/v1/business/stripe/disconnect";
    private const string BusinessEndpoint = "/api/v1/business";

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };

    private static async Task<HttpClient> RegisteredClientAsync(AuthenticatedRouteTestFactory factory, string email)
    {
        var client = factory.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
        var response = await client.PostAsJsonAsync("/api/v1/auth/register", new RegisterAccountRequest(email, "Password1", "Password1", null));
        response.EnsureSuccessStatusCode();
        return client;
    }

    private static string ExtractState(Uri location) =>
        QueryHelpers.ParseQuery(location.Query)["state"].ToString();

    private static async Task<BusinessProfileDto> GetProfileAsync(HttpClient client)
    {
        var response = await client.GetAsync(BusinessEndpoint);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<BusinessProfileDto>(JsonOptions))!;
    }

    [Fact]
    public async Task Connect_redirects_to_stripe_with_a_state_token_and_sets_a_state_cookie()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "stripe-connect-shape@example.com");

        var response = await client.GetAsync(ConnectEndpoint);

        Assert.Equal(HttpStatusCode.Redirect, response.StatusCode);
        var location = response.Headers.Location!;
        Assert.StartsWith("https://connect.stripe.com/oauth/authorize", location.ToString());
        Assert.NotEmpty(ExtractState(location));
        Assert.True(response.Headers.TryGetValues("Set-Cookie", out var cookies));
        Assert.Contains(cookies!, cookie => cookie.StartsWith("stripe_oauth_state=", StringComparison.Ordinal));
    }

    [Fact]
    public async Task Connect_requires_a_session()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var anonymousClient = factory.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });

        var response = await anonymousClient.GetAsync(ConnectEndpoint);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Full_round_trip_connects_the_businesss_stripe_account()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "stripe-connect-success@example.com");
        factory.StripeConnectService.AccountIdToReturn = "acct_success123";

        var connectResponse = await client.GetAsync(ConnectEndpoint);
        var state = ExtractState(connectResponse.Headers.Location!);

        // The same HttpClient instance carries the Set-Cookie from the redirect-out response
        // forward automatically (standard CookieContainer behavior) - simulates the browser
        // sending it back on Stripe's top-level GET redirect to our callback.
        var callbackResponse = await client.GetAsync($"{CallbackEndpoint}?state={state}&code=test-code");

        Assert.Equal(HttpStatusCode.Redirect, callbackResponse.StatusCode);
        Assert.Equal("http://localhost:3000/settings/business?stripeConnected=1", callbackResponse.Headers.Location!.ToString());
        var profile = await GetProfileAsync(client);
        Assert.Equal("acct_success123", profile.StripeAccountId);
    }

    [Fact]
    public async Task Callback_with_a_stripe_error_redirects_to_settings_with_an_error_flag_and_does_not_connect()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "stripe-connect-denied@example.com");
        var connectResponse = await client.GetAsync(ConnectEndpoint);
        var state = ExtractState(connectResponse.Headers.Location!);

        var callbackResponse = await client.GetAsync($"{CallbackEndpoint}?error=access_denied&state={state}");

        Assert.Equal(HttpStatusCode.Redirect, callbackResponse.StatusCode);
        Assert.Equal("http://localhost:3000/settings/business?stripeConnectError=1", callbackResponse.Headers.Location!.ToString());
        var profile = await GetProfileAsync(client);
        Assert.Null(profile.StripeAccountId);
    }

    [Fact]
    public async Task Callback_with_a_mismatched_state_is_rejected()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "stripe-connect-badstate@example.com");
        await client.GetAsync(ConnectEndpoint); // Sets the real state cookie, but never used below.

        var callbackResponse = await client.GetAsync($"{CallbackEndpoint}?state=not-the-real-state&code=test-code");

        Assert.Equal("http://localhost:3000/settings/business?stripeConnectError=1", callbackResponse.Headers.Location!.ToString());
        var profile = await GetProfileAsync(client);
        Assert.Null(profile.StripeAccountId);
    }

    [Fact]
    public async Task Callback_hit_directly_with_no_prior_connect_call_is_rejected()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "stripe-connect-noprior@example.com");

        var callbackResponse = await client.GetAsync($"{CallbackEndpoint}?state=anything&code=test-code");

        Assert.Equal("http://localhost:3000/settings/business?stripeConnectError=1", callbackResponse.Headers.Location!.ToString());
    }

    [Fact]
    public async Task Callback_is_rejected_when_the_code_exchange_itself_fails()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "stripe-connect-exchangefail@example.com");
        factory.StripeConnectService.ThrowOnExchange = new InvalidOperationException("invalid_grant");
        var connectResponse = await client.GetAsync(ConnectEndpoint);
        var state = ExtractState(connectResponse.Headers.Location!);

        var callbackResponse = await client.GetAsync($"{CallbackEndpoint}?state={state}&code=test-code");

        Assert.Equal("http://localhost:3000/settings/business?stripeConnectError=1", callbackResponse.Headers.Location!.ToString());
        var profile = await GetProfileAsync(client);
        Assert.Null(profile.StripeAccountId);
    }

    [Fact]
    public async Task Disconnect_deauthorizes_on_stripe_and_clears_the_local_account_id()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "stripe-disconnect@example.com");
        var connectResponse = await client.GetAsync(ConnectEndpoint);
        var state = ExtractState(connectResponse.Headers.Location!);
        await client.GetAsync($"{CallbackEndpoint}?state={state}&code=test-code");

        var disconnectResponse = await client.PostAsync(DisconnectEndpoint, null);

        Assert.Equal(HttpStatusCode.OK, disconnectResponse.StatusCode);
        var profile = await disconnectResponse.Content.ReadFromJsonAsync<BusinessProfileDto>(JsonOptions);
        Assert.Null(profile!.StripeAccountId);
        Assert.Equal(["acct_faketest123"], factory.StripeConnectService.DeauthorizedAccountIds);
    }

    [Fact]
    public async Task Disconnecting_an_account_that_was_never_connected_is_a_no_op()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var client = await RegisteredClientAsync(factory, "stripe-disconnect-noop@example.com");

        var response = await client.PostAsync(DisconnectEndpoint, null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Empty(factory.StripeConnectService.DeauthorizedAccountIds);
    }

    [Fact]
    public async Task Disconnect_requires_a_session()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var anonymousClient = factory.CreateClient();

        var response = await anonymousClient.PostAsync(DisconnectEndpoint, null);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
