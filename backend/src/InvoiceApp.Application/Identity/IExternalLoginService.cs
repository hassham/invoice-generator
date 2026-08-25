namespace InvoiceApp.Application.Identity;

/// <summary>
/// Finds or creates the account for an already-verified external identity (currently Google) and
/// starts a session for it (docs/SAD.md section 38: "OAuth integrations should attach external
/// identities to internal application users"). The OAuth handshake itself (challenge, token
/// exchange, claims extraction) is an Infrastructure/ASP.NET Core concern handled before this is
/// called - this only ever sees the already-parsed result.
/// </summary>
public interface IExternalLoginService
{
    Task<LoggedInAccount> SignInOrRegisterAsync(ExternalLoginRequest request, CancellationToken cancellationToken);
}
