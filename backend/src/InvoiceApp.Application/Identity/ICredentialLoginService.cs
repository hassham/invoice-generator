namespace InvoiceApp.Application.Identity;

/// <summary>
/// Verifies email/password and starts the session (FSD 8). Every failure mode - unknown email,
/// wrong password, disallowed sign-in - collapses into the same
/// <see cref="Exceptions.UnauthorizedException"/> with FSD 8's exact generic message, since the
/// requirement is explicit: do not expose whether a particular email exists.
/// </summary>
public interface ICredentialLoginService
{
    Task<LoggedInAccount> SignInWithPasswordAsync(LoginRequest request, CancellationToken cancellationToken);
}
