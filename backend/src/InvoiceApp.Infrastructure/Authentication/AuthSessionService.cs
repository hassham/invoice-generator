using InvoiceApp.Application.Exceptions;
using InvoiceApp.Application.Identity;
using InvoiceApp.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;

namespace InvoiceApp.Infrastructure.Authentication;

public sealed class AuthSessionService(
    SignInManager<ApplicationUser> signInManager,
    UserManager<ApplicationUser> userManager) : IAuthSessionService
{
    public async Task SignInAsync(Guid userId, CancellationToken cancellationToken)
    {
        var user = await userManager.FindByIdAsync(userId.ToString())
            ?? throw new NotFoundException("Account not found.");

        await signInManager.SignInAsync(user, isPersistent: false);
    }
}
