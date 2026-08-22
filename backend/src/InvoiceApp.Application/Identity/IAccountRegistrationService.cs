namespace InvoiceApp.Application.Identity;

/// <summary>
/// Creates a user account and its default business profile as one atomic operation (FSD 7.1: no
/// partial state on failure). Throws <see cref="Exceptions.ConflictException"/> if the email is
/// already registered, or <see cref="Exceptions.ValidationException"/> if the password fails the
/// configured Identity password rules.
/// </summary>
public interface IAccountRegistrationService
{
    Task<RegisteredAccount> RegisterAsync(RegisterAccountRequest request, CancellationToken cancellationToken);
}
