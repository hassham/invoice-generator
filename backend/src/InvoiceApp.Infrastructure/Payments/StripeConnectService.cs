using InvoiceApp.Application.Payments;
using InvoiceApp.Infrastructure.Configuration;
using Microsoft.Extensions.Options;
using Stripe;

namespace InvoiceApp.Infrastructure.Payments;

public sealed class StripeConnectService(IOptions<StripeOptions> stripeOptions) : IStripeConnectService
{
    private readonly StripeOptions options = stripeOptions.Value;

    public string BuildAuthorizeUrl(string redirectUri, string state) =>
        "https://connect.stripe.com/oauth/authorize"
        + $"?response_type=code&client_id={Uri.EscapeDataString(options.ConnectClientId)}"
        + "&scope=read_write"
        + $"&redirect_uri={Uri.EscapeDataString(redirectUri)}"
        + $"&state={Uri.EscapeDataString(state)}";

    public async Task<string> ExchangeCodeForAccountIdAsync(string code, CancellationToken cancellationToken)
    {
        var client = new StripeClient(options.SecretKey);
        var service = new OAuthTokenService(client);
        var token = await service.CreateAsync(
            new OAuthTokenCreateOptions { ClientSecret = options.SecretKey, Code = code, GrantType = "authorization_code" },
            cancellationToken: cancellationToken);

        return token.StripeUserId;
    }

    public async Task DeauthorizeAsync(string stripeAccountId, CancellationToken cancellationToken)
    {
        var client = new StripeClient(options.SecretKey);
        var service = new OAuthTokenService(client);
        await service.DeauthorizeAsync(
            new OAuthDeauthorizeOptions { ClientId = options.ConnectClientId, StripeUserId = stripeAccountId },
            cancellationToken: cancellationToken);
    }
}
