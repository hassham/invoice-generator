namespace InvoiceApp.Application.Identity;

/// <summary>
/// Issues the authenticated session (FSD 7.1: successful registration logs the user in). Cookie
/// vs token transport is an Infrastructure decision (SAD 37); callers only know a session starts.
/// </summary>
public interface IAuthSessionService
{
    Task SignInAsync(Guid userId, CancellationToken cancellationToken);
}
