using System.Text.RegularExpressions;
using InvoiceApp.Application.Exceptions;
using InvoiceApp.Application.Identity;

namespace InvoiceApp.Modules.Identity.PasswordReset;

public static class ForgotPasswordRequestValidator
{
    private static readonly Regex EmailPattern = new(@"^[^\s@]+@[^\s@]+\.[^\s@]+$", RegexOptions.Compiled);

    public static void Validate(ForgotPasswordRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || !EmailPattern.IsMatch(request.Email))
        {
            throw new ValidationException("A valid email address is required.");
        }
    }
}
