using InvoiceApp.Application.Exceptions;
using InvoiceApp.Application.Identity;

namespace InvoiceApp.Modules.Identity.Login;

/// <summary>
/// Only checks that fields are present - unlike registration there are no format/complexity
/// rules to enforce client-side, since credential correctness is checked against the stored
/// account (FSD 8), not against a policy. An empty field carries no enumeration risk (there's no
/// email being checked), so this can use a specific message rather than FSD 8's generic one.
/// </summary>
public static class LoginRequestValidator
{
    public static void Validate(LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email))
        {
            throw new ValidationException("Email is required.");
        }

        if (string.IsNullOrEmpty(request.Password))
        {
            throw new ValidationException("Password is required.");
        }
    }
}
