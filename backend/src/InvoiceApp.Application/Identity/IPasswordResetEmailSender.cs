namespace InvoiceApp.Application.Identity;

/// <summary>
/// Delivers a password-reset token to the account holder. The only implementation today is a
/// dev-only log stub (InvoiceApp.Infrastructure.Authentication.LoggingPasswordResetEmailSender);
/// swapping in a real transactional email provider is a follow-up task and should only require a
/// new implementation of this interface, not changes to PasswordResetService.
/// </summary>
public interface IPasswordResetEmailSender
{
    Task SendAsync(string email, string token, CancellationToken cancellationToken);
}
