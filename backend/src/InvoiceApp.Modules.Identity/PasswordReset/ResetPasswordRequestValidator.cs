using InvoiceApp.Application.Exceptions;
using InvoiceApp.Application.Identity;

namespace InvoiceApp.Modules.Identity.PasswordReset;

/// <summary>
/// Field-level checks that don't need persistence - matches RegistrationRequestValidator's
/// split, where password complexity beyond "present" is enforced by Identity's configured
/// PasswordOptions (via UserManager.ResetPasswordAsync), not duplicated here.
/// </summary>
public static class ResetPasswordRequestValidator
{
    public static void Validate(ResetPasswordRequest request)
    {
        var errors = new List<string>();

        if (string.IsNullOrWhiteSpace(request.Email))
        {
            errors.Add("Email is required.");
        }

        if (string.IsNullOrEmpty(request.Token))
        {
            errors.Add("Reset token is required.");
        }

        if (string.IsNullOrEmpty(request.NewPassword))
        {
            errors.Add("New password is required.");
        }
        else if (request.NewPassword != request.ConfirmPassword)
        {
            errors.Add("New password and confirm password must match.");
        }

        if (errors.Count > 0)
        {
            throw new ValidationException(string.Join(" ", errors));
        }
    }
}
