using InvoiceApp.Application.Exceptions;
using InvoiceApp.Application.Identity;
using InvoiceApp.Domain.Businesses;
using InvoiceApp.Infrastructure.Identity;
using InvoiceApp.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace InvoiceApp.Infrastructure.Authentication;

public sealed class ExternalLoginService(
    UserManager<ApplicationUser> userManager,
    IAuthSessionService authSessionService,
    ApplicationDbContext dbContext) : IExternalLoginService
{
    public async Task<LoggedInAccount> SignInOrRegisterAsync(ExternalLoginRequest request, CancellationToken cancellationToken)
    {
        var user = await userManager.FindByLoginAsync(request.Provider, request.ProviderKey);

        if (user is null)
        {
            if (string.IsNullOrWhiteSpace(request.Email))
            {
                throw new ValidationException("Google did not provide an email address for this account.");
            }

            var existingByEmail = await userManager.FindByEmailAsync(request.Email);

            if (existingByEmail is not null && !request.EmailVerified)
            {
                // Only a verified identity may link to an existing account (IG-23: "does not
                // create duplicate accounts for the same verified identity") - an unverified
                // email claim is not strong enough evidence to attach to someone else's account.
                throw new ValidationException(
                    "An account with this email already exists. Please sign in with your password instead.");
            }

            user = existingByEmail ?? await CreateAccountAsync(request, cancellationToken);

            var linkResult = await userManager.AddLoginAsync(
                user, new UserLoginInfo(request.Provider, request.ProviderKey, request.Provider));
            if (!linkResult.Succeeded)
            {
                throw new ValidationException(string.Join(" ", linkResult.Errors.Select(error => error.Description)));
            }
        }

        if (user.Status != "Active")
        {
            // Same treatment as a deleted account trying to log in with a password
            // (CredentialLoginService) - the account is unusable regardless of how someone
            // proves they control it.
            throw new UnauthorizedException("This account is no longer available.");
        }

        await authSessionService.SignInAsync(user.Id, cancellationToken);

        return new LoggedInAccount(user.Id, user.Email!, user.Name);
    }

    private async Task<ApplicationUser> CreateAccountAsync(ExternalLoginRequest request, CancellationToken cancellationToken)
    {
        // Mirrors AccountRegistrationService's account+default-business creation, minus a
        // password - this account can only be signed into via Google unless the user later sets
        // one (not built yet; out of scope for IG-93/IG-94).
        var useTransaction = dbContext.Database.IsRelational();
        await using var transaction = useTransaction
            ? await dbContext.Database.BeginTransactionAsync(cancellationToken)
            : null;

        var now = DateTimeOffset.UtcNow;
        var user = new ApplicationUser
        {
            UserName = request.Email,
            Email = request.Email,
            EmailConfirmed = request.EmailVerified,
            Name = request.Name,
            Status = "Active",
            CreatedAt = now,
            UpdatedAt = now,
        };

        var createResult = await userManager.CreateAsync(user);
        if (!createResult.Succeeded)
        {
            if (createResult.Errors.Any(error => error.Code is "DuplicateUserName" or "DuplicateEmail"))
            {
                throw new ConflictException("An account with this email already exists.");
            }

            throw new ValidationException(string.Join(" ", createResult.Errors.Select(error => error.Description)));
        }

        var business = new Business
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            BusinessName = string.IsNullOrWhiteSpace(request.Name) ? "My Business" : $"{request.Name}'s Business",
            Country = "AU",
            DefaultCurrency = "AUD",
            CreatedAt = now,
            UpdatedAt = now,
        };

        dbContext.Businesses.Add(business);
        await dbContext.SaveChangesAsync(cancellationToken);

        if (transaction is not null)
        {
            await transaction.CommitAsync(cancellationToken);
        }

        return user;
    }
}
