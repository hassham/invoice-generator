namespace InvoiceApp.Application.Identity;

/// <summary>
/// Issues and ends the authenticated session (FSD 7.1: successful registration logs the user in;
/// FSD 8/IG-24: signing out invalidates it). Cookie vs token transport is an Infrastructure
/// decision (SAD 37); callers only know a session starts or ends.
/// </summary>
public interface IAuthSessionService
{
    Task SignInAsync(Guid userId, CancellationToken cancellationToken);

    Task SignOutAsync(CancellationToken cancellationToken);

    /// <summary>
    /// Loads the current account's own data rather than trusting the cookie's claims: Identity's
    /// default ClaimTypes.Name claim reflects UserName (which this app sets to the email), not
    /// the display Name property, so reading it directly from the claims principal would return
    /// the wrong value.
    /// </summary>
    Task<LoggedInAccount?> GetCurrentAsync(Guid userId, CancellationToken cancellationToken);
}
