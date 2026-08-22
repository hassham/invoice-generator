using System.Text.RegularExpressions;
using InvoiceApp.Application.Exceptions;
using InvoiceApp.Application.Identity;

namespace InvoiceApp.Modules.Identity.Registration;

/// <summary>
/// Field-level checks that don't need persistence (FSD 7.1). Password complexity beyond
/// "present" is enforced by Identity's configured PasswordOptions in Infrastructure, not
/// duplicated here, so the two rule sets can't drift out of sync.
/// </summary>
public static class RegistrationRequestValidator
{
    private static readonly Regex EmailPattern = new(@"^[^\s@]+@[^\s@]+\.[^\s@]+$", RegexOptions.Compiled);

    public static void Validate(RegisterAccountRequest request)
    {
        var errors = new List<string>();

        if (string.IsNullOrWhiteSpace(request.Email) || !EmailPattern.IsMatch(request.Email))
        {
            errors.Add("A valid email address is required.");
        }

        if (string.IsNullOrEmpty(request.Password))
        {
            errors.Add("Password is required.");
        }
        else if (request.Password != request.ConfirmPassword)
        {
            errors.Add("Password and confirm password must match.");
        }

        if (errors.Count > 0)
        {
            throw new ValidationException(string.Join(" ", errors));
        }
    }
}
