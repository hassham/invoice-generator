using InvoiceApp.Application.Exceptions;
using InvoiceApp.Application.Identity;
using InvoiceApp.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;

namespace InvoiceApp.Infrastructure.Authentication;

public sealed class PasswordResetService(
    UserManager<ApplicationUser> userManager,
    IPasswordResetEmailSender emailSender) : IPasswordResetService
{
    private const string InvalidTokenMessage = "This reset link is invalid or has expired. Please request a new one.";

    public async Task RequestResetAsync(string email, CancellationToken cancellationToken)
    {
        var user = await userManager.FindByEmailAsync(email);

        // Silently no-ops for an unknown email or an inactive account - the caller gets the same
        // response either way, so neither case can be distinguished from the outside (FSD 9 /
        // STORIES S13: "does not disclose whether an email exists").
        if (user is null || user.Status != "Active")
        {
            return;
        }

        var token = await userManager.GeneratePasswordResetTokenAsync(user);
        await emailSender.SendAsync(email, token, cancellationToken);
    }

    public async Task ResetPasswordAsync(ResetPasswordRequest request, CancellationToken cancellationToken)
    {
        var user = await userManager.FindByEmailAsync(request.Email);

        if (user is null || user.Status != "Active")
        {
            // Same generic message as an invalid/expired token below - an unknown or deleted
            // account must not be distinguishable from a bad token (FSD 9).
            throw new ValidationException(InvalidTokenMessage);
        }

        // ResetPasswordAsync verifies the token against the user's current security stamp before
        // touching the password, and a successful reset rotates that stamp as a side effect
        // (UserManager.UpdatePasswordHash) - that rotation is what makes the token single-use:
        // any other outstanding token for this user (reused, or requested again later) embeds the
        // old stamp and will fail verification once this call succeeds.
        var result = await userManager.ResetPasswordAsync(user, request.Token, request.NewPassword);
        if (!result.Succeeded)
        {
            if (result.Errors.Any(error => error.Code == "InvalidToken"))
            {
                throw new ValidationException(InvalidTokenMessage);
            }

            throw new ValidationException(string.Join(" ", result.Errors.Select(error => error.Description)));
        }
    }
}
