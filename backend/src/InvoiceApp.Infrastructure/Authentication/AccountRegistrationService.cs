using InvoiceApp.Application.Exceptions;
using InvoiceApp.Application.Identity;
using InvoiceApp.Domain.Businesses;
using InvoiceApp.Infrastructure.Identity;
using InvoiceApp.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace InvoiceApp.Infrastructure.Authentication;

public sealed class AccountRegistrationService(
    UserManager<ApplicationUser> userManager,
    ApplicationDbContext dbContext) : IAccountRegistrationService
{
    public async Task<RegisteredAccount> RegisterAsync(RegisterAccountRequest request, CancellationToken cancellationToken)
    {
        // Database.IsRelational() lets this run under EF Core's InMemory provider in tests
        // (which doesn't support transactions) while still getting real atomicity against
        // Postgres - user + default business must never partially persist (FSD 7.1).
        var useTransaction = dbContext.Database.IsRelational();
        await using var transaction = useTransaction
            ? await dbContext.Database.BeginTransactionAsync(cancellationToken)
            : null;

        var now = DateTimeOffset.UtcNow;
        var user = new ApplicationUser
        {
            UserName = request.Email,
            Email = request.Email,
            Name = request.Name,
            Status = "Active",
            CreatedAt = now,
            UpdatedAt = now,
        };

        var createResult = await userManager.CreateAsync(user, request.Password);
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
            // FSD 7.1 collects only email/password/name at registration - no country/currency.
            // AU/AUD reflects PRD 23's "Australia can be an initial target market" framing;
            // editable later via business settings (FSD 62).
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

        return new RegisteredAccount(user.Id, business.Id);
    }
}
