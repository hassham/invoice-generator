using InvoiceApp.Application.Payments;

namespace InvoiceApp.Api.Tests.Authentication;

/// <summary>
/// Stands in for the real Stripe API call IStripeConnectService.ExchangeCodeForAccountIdAsync/
/// DeauthorizeAsync would otherwise make - HTTP-level tests need a deterministic, network-free
/// result to assert against, same reasoning as FakeEmailSender/FakePasswordResetEmailSender.
/// BuildAuthorizeUrl needs no faking (it's pure string construction, no network call, even in the
/// real implementation), so this delegates to the same logic for a realistic redirect URL shape.
/// </summary>
public sealed class FakeStripeConnectService : IStripeConnectService
{
    public string AccountIdToReturn { get; set; } = "acct_faketest123";

    public Exception? ThrowOnExchange { get; set; }

    public List<string> DeauthorizedAccountIds { get; } = [];

    public string BuildAuthorizeUrl(string redirectUri, string state) =>
        "https://connect.stripe.com/oauth/authorize"
        + $"?response_type=code&client_id=ca_test_connect_client"
        + "&scope=read_write"
        + $"&redirect_uri={Uri.EscapeDataString(redirectUri)}"
        + $"&state={Uri.EscapeDataString(state)}";

    public Task<string> ExchangeCodeForAccountIdAsync(string code, CancellationToken cancellationToken)
    {
        if (ThrowOnExchange is { } exception)
        {
            throw exception;
        }

        return Task.FromResult(AccountIdToReturn);
    }

    public Task DeauthorizeAsync(string stripeAccountId, CancellationToken cancellationToken)
    {
        DeauthorizedAccountIds.Add(stripeAccountId);
        return Task.CompletedTask;
    }
}
