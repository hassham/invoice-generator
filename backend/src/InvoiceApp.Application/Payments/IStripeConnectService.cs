namespace InvoiceApp.Application.Payments;

/// <summary>
/// IG-219: Stripe Connect isn't a built-in ASP.NET Core authentication provider the way Google is
/// (InfrastructureAuthenticationExtensions' AddGoogle(...) has no Stripe equivalent) - this hand-
/// rolls the OAuth "Standard" flow's two HTTP legs instead. Mirrors IExternalLoginService's own
/// split: the OAuth handshake itself lives here (an Infrastructure/external-API concern), while
/// persisting the result onto a Business row is IBusinessService's job.
/// </summary>
public interface IStripeConnectService
{
    /// <summary>Builds the URL to redirect the browser to for Stripe's own consent screen - no
    /// HTTP call, this is pure URL construction.</summary>
    string BuildAuthorizeUrl(string redirectUri, string state);

    /// <summary>Exchanges the authorization code Stripe redirected back with for the connected
    /// account's id (acct_...). Throws on any failure - an invalid/expired/already-used code is
    /// not a case the caller can usefully recover from beyond surfacing an error.</summary>
    Task<string> ExchangeCodeForAccountIdAsync(string code, CancellationToken cancellationToken);

    /// <summary>Revokes the platform's access to the connected account on Stripe's own side - not
    /// just forgetting the id locally (BusinessService.DisconnectStripeAsync's job), a genuine
    /// disconnect.</summary>
    Task DeauthorizeAsync(string stripeAccountId, CancellationToken cancellationToken);
}
