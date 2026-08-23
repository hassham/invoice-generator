using InvoiceApp.Application.Exceptions;
using InvoiceApp.Application.Identity;
using InvoiceApp.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;

namespace InvoiceApp.Infrastructure.Authentication;

public sealed class CredentialLoginService(
    SignInManager<ApplicationUser> signInManager,
    UserManager<ApplicationUser> userManager) : ICredentialLoginService
{
    private const string GenericFailureMessage = "Incorrect email or password.";

    public async Task<LoggedInAccount> SignInWithPasswordAsync(LoginRequest request, CancellationToken cancellationToken)
    {
        // lockoutOnFailure: false - brute-force/rate limiting is explicit, separate future scope
        // (docs/SAD.md section 112), not part of FSD 8's login requirements.
        var result = await signInManager.PasswordSignInAsync(
            request.Email,
            request.Password,
            isPersistent: request.RememberMe,
            lockoutOnFailure: false);

        if (!result.Succeeded)
        {
            // Every failure mode - unknown email, wrong password, not-allowed - collapses into
            // the same message (FSD 8: do not expose whether a particular email exists).
            throw new UnauthorizedException(GenericFailureMessage);
        }

        var user = await userManager.FindByEmailAsync(request.Email)
            ?? throw new UnauthorizedException(GenericFailureMessage);

        return new LoggedInAccount(user.Id, request.Email, user.Name);
    }
}
