using InvoiceApp.Application.Exceptions;
using InvoiceApp.Application.Identity;
using InvoiceApp.Domain.Audit;
using InvoiceApp.Infrastructure.Identity;
using InvoiceApp.Infrastructure.Persistence;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;

namespace InvoiceApp.Infrastructure.Authentication;

public sealed class AccountDeletionService(
    UserManager<ApplicationUser> userManager,
    IAuthSessionService authSessionService,
    ApplicationDbContext dbContext,
    IHttpContextAccessor httpContextAccessor) : IAccountDeletionService
{
    private const string IncorrectPasswordMessage = "Incorrect password.";

    public async Task DeleteAsync(Guid userId, string currentPassword, CancellationToken cancellationToken)
    {
        var user = await userManager.FindByIdAsync(userId.ToString())
            ?? throw new NotFoundException("Account not found.");

        if (!await userManager.CheckPasswordAsync(user, currentPassword))
        {
            throw new UnauthorizedException(IncorrectPasswordMessage);
        }

        user.Status = "Deleted";
        user.UpdatedAt = DateTimeOffset.UtcNow;

        // Staged before UserManager.UpdateAsync below, whose own internal SaveChanges flush
        // persists both the status flip and this audit record together - deletion must never
        // happen without leaving the required audit evidence (FSD 83; IG-102 completion
        // criteria).
        dbContext.AuditLogs.Add(new AuditLog
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            EntityType = "Account",
            EntityId = user.Id,
            Action = "AccountDeleted",
            IpAddress = httpContextAccessor.HttpContext?.Connection.RemoteIpAddress?.ToString(),
            Timestamp = DateTimeOffset.UtcNow,
        });

        var updateResult = await userManager.UpdateAsync(user);
        if (!updateResult.Succeeded)
        {
            throw new ValidationException(string.Join(" ", updateResult.Errors.Select(error => error.Description)));
        }

        await authSessionService.SignOutAsync(cancellationToken);
    }
}
