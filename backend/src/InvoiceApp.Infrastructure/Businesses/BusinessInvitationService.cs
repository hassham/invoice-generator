using System.Net;
using System.Net.Mail;
using System.Security.Cryptography;
using System.Text;
using InvoiceApp.Application.Businesses;
using InvoiceApp.Application.Email;
using InvoiceApp.Application.Exceptions;
using InvoiceApp.Domain.Businesses;
using InvoiceApp.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace InvoiceApp.Infrastructure.Businesses;

/// <summary>
/// IG-239 / IG-297 / IG-298. The invite link carries a random token; only its SHA-256 hash is stored.
/// An invitation is accepted by a signed-in account whose email matches the invited address, which
/// keeps the link useless to anyone else who sees it. Expires after 7 days.
/// </summary>
public sealed class BusinessInvitationService(ApplicationDbContext dbContext, IEmailSender emailSender, IConfiguration configuration) : IBusinessInvitationService
{
    private static readonly TimeSpan InvitationLifetime = TimeSpan.FromDays(7);

    public async Task<BusinessInvitationDto> InviteAsync(Guid userId, Guid businessId, InviteBusinessMemberRequest request, CancellationToken cancellationToken)
    {
        var business = await LoadOwnedBusinessAsync(userId, businessId, cancellationToken);
        var email = NormalizeEmail(request.Email);
        var normalizedEmail = email.ToUpperInvariant();
        var now = DateTimeOffset.UtcNow;

        var ownerEmail = await dbContext.Users.Where(user => user.Id == userId).Select(user => user.NormalizedEmail).SingleAsync(cancellationToken);
        if (ownerEmail == normalizedEmail)
        {
            throw new ConflictException("You already own this business.");
        }

        var alreadyMember = await dbContext.BusinessMemberships
            .Where(membership => membership.BusinessId == businessId && membership.RevokedAt == null)
            .Join(dbContext.Users, membership => membership.UserId, user => user.Id, (membership, user) => user.NormalizedEmail)
            .AnyAsync(member => member == normalizedEmail, cancellationToken);
        if (alreadyMember)
        {
            throw new ConflictException("This person is already a team member.");
        }

        var alreadyInvited = await dbContext.BusinessInvitations.AnyAsync(
            invitation => invitation.BusinessId == businessId
                && invitation.Email == email
                && invitation.AcceptedAt == null
                && invitation.CancelledAt == null
                && invitation.ExpiresAt > now,
            cancellationToken);
        if (alreadyInvited)
        {
            throw new ConflictException("This email address already has a pending invitation.");
        }

        var token = GenerateToken();
        var invitation = new BusinessInvitation
        {
            Id = Guid.NewGuid(),
            BusinessId = businessId,
            Email = email,
            TokenHash = HashToken(token),
            InvitedByUserId = userId,
            Role = request.Role,
            CreatedAt = now,
            ExpiresAt = now.Add(InvitationLifetime),
        };

        dbContext.BusinessInvitations.Add(invitation);
        await dbContext.SaveChangesAsync(cancellationToken);

        try
        {
            await emailSender.SendAsync(BuildInvitationEmail(email, business.BusinessName, token, invitation.ExpiresAt), cancellationToken);
        }
        catch
        {
            // The link never reached the invitee, so the invitation must not stay pending.
            invitation.CancelledAt = DateTimeOffset.UtcNow;
            await dbContext.SaveChangesAsync(cancellationToken);
            throw;
        }

        return ToDto(invitation);
    }

    public async Task<BusinessTeamDto> GetTeamAsync(Guid userId, Guid businessId, CancellationToken cancellationToken)
    {
        await LoadOwnedBusinessAsync(userId, businessId, cancellationToken);
        var now = DateTimeOffset.UtcNow;

        var pending = await dbContext.BusinessInvitations
            .Where(invitation => invitation.BusinessId == businessId && invitation.AcceptedAt == null && invitation.CancelledAt == null && invitation.ExpiresAt > now)
            .OrderByDescending(invitation => invitation.CreatedAt)
            .ToListAsync(cancellationToken);

        var members = await dbContext.BusinessMemberships
            .Where(membership => membership.BusinessId == businessId && membership.RevokedAt == null)
            .Join(dbContext.Users, membership => membership.UserId, user => user.Id, (membership, user) => new { membership.Id, membership.UserId, user.Email, membership.Role, membership.CreatedAt })
            .OrderBy(member => member.CreatedAt)
            .ToListAsync(cancellationToken);

        return new BusinessTeamDto(
            pending.Select(ToDto).ToList(),
            members.Select(member => new BusinessMemberDto(member.Id, member.UserId, member.Email ?? string.Empty, member.Role, member.CreatedAt)).ToList());
    }

    public async Task ChangeMemberRoleAsync(Guid userId, Guid businessId, Guid membershipId, ChangeMemberRoleRequest request, CancellationToken cancellationToken)
    {
        await LoadOwnedBusinessAsync(userId, businessId, cancellationToken);
        var membership = await dbContext.BusinessMemberships.FirstOrDefaultAsync(
            m => m.Id == membershipId && m.BusinessId == businessId && m.RevokedAt == null, cancellationToken)
            ?? throw new NotFoundException("Team member not found.");

        if (membership.Role != request.Role)
        {
            membership.Role = request.Role;
            await dbContext.SaveChangesAsync(cancellationToken);
        }
    }

    public async Task CancelInvitationAsync(Guid userId, Guid businessId, Guid invitationId, CancellationToken cancellationToken)
    {
        await LoadOwnedBusinessAsync(userId, businessId, cancellationToken);
        var invitation = await dbContext.BusinessInvitations.FirstOrDefaultAsync(
            i => i.Id == invitationId && i.BusinessId == businessId, cancellationToken)
            ?? throw new NotFoundException("Invitation not found.");

        var now = DateTimeOffset.UtcNow;
        if (invitation.AcceptedAt is not null || invitation.CancelledAt is not null || invitation.ExpiresAt <= now)
        {
            throw new ConflictException("This invitation is no longer pending.");
        }

        invitation.CancelledAt = now;
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task RemoveMemberAsync(Guid userId, Guid businessId, Guid membershipId, CancellationToken cancellationToken)
    {
        await LoadOwnedBusinessAsync(userId, businessId, cancellationToken);
        var membership = await dbContext.BusinessMemberships.FirstOrDefaultAsync(
            m => m.Id == membershipId && m.BusinessId == businessId && m.RevokedAt == null, cancellationToken)
            ?? throw new NotFoundException("Team member not found.");

        membership.RevokedAt = DateTimeOffset.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<InvitationDto> GetInvitationAsync(Guid userId, string token, CancellationToken cancellationToken)
    {
        var (invitation, business) = await ValidateForAcceptanceAsync(userId, token, cancellationToken);
        return new InvitationDto(business.Id, business.BusinessName, invitation.Email, invitation.ExpiresAt);
    }

    public async Task<InvitationDto> AcceptInvitationAsync(Guid userId, string token, CancellationToken cancellationToken)
    {
        var (invitation, business) = await ValidateForAcceptanceAsync(userId, token, cancellationToken);

        if (invitation.AcceptedAt is null)
        {
            var membership = await dbContext.BusinessMemberships.FirstOrDefaultAsync(
                m => m.BusinessId == business.Id && m.UserId == userId, cancellationToken);

            if (membership is null)
            {
                dbContext.BusinessMemberships.Add(new BusinessMembership
                {
                    Id = Guid.NewGuid(),
                    BusinessId = business.Id,
                    UserId = userId,
                    Role = invitation.Role,
                    CreatedAt = DateTimeOffset.UtcNow,
                });
            }
            else
            {
                // A member who was removed and is invited back gets their row reactivated, not duplicated,
                // and takes the role of the new invitation.
                membership.RevokedAt = null;
                membership.Role = invitation.Role;
            }

            invitation.AcceptedAt = DateTimeOffset.UtcNow;
            invitation.AcceptedByUserId = userId;
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        return new InvitationDto(business.Id, business.BusinessName, invitation.Email, invitation.ExpiresAt);
    }

    /// <summary>Shared by preview and accept, so the page shows exactly why accepting would fail.
    /// An invitation the same user already accepted is returned as-is, which keeps accept idempotent.</summary>
    private async Task<(BusinessInvitation Invitation, Business Business)> ValidateForAcceptanceAsync(Guid userId, string token, CancellationToken cancellationToken)
    {
        var invitation = await dbContext.BusinessInvitations.FirstOrDefaultAsync(i => i.TokenHash == HashToken(token), cancellationToken)
            ?? throw new NotFoundException("This invitation link is not valid.");

        var signedInEmail = await dbContext.Users.Where(user => user.Id == userId).Select(user => user.NormalizedEmail).SingleAsync(cancellationToken);
        if (signedInEmail != invitation.Email.ToUpperInvariant())
        {
            throw new ForbiddenException("This invitation was sent to a different email address. Sign in with that address to accept it.");
        }

        var business = await dbContext.Businesses.FirstAsync(b => b.Id == invitation.BusinessId, cancellationToken);

        if (invitation.AcceptedAt is not null)
        {
            if (invitation.AcceptedByUserId == userId)
            {
                return (invitation, business);
            }

            throw new ConflictException("This invitation has already been accepted.");
        }

        if (invitation.CancelledAt is not null)
        {
            throw new ConflictException("This invitation was cancelled.");
        }

        if (invitation.ExpiresAt <= DateTimeOffset.UtcNow)
        {
            throw new ConflictException("This invitation has expired. Ask the business owner to send a new one.");
        }

        return (invitation, business);
    }

    private async Task<Business> LoadOwnedBusinessAsync(Guid userId, Guid businessId, CancellationToken cancellationToken)
    {
        var business = await dbContext.AccessibleBusinesses(userId).FirstOrDefaultAsync(b => b.Id == businessId, cancellationToken)
            ?? throw new NotFoundException("Business not found.");

        // A team member can see the business but not manage its team (IG-240 will refine this).
        if (business.UserId != userId)
        {
            throw new ForbiddenException("Only the business owner can manage the team.");
        }

        return business;
    }

    private static string NormalizeEmail(string? email)
    {
        var trimmed = (email ?? string.Empty).Trim().ToLowerInvariant();
        if (trimmed.Length == 0 || trimmed.Length > 320 || !IsPlausibleAddress(trimmed))
        {
            throw new ValidationException("Enter a valid email address.");
        }

        return trimmed;
    }

    private static bool IsPlausibleAddress(string address)
    {
        try
        {
            return new MailAddress(address).Address == address;
        }
        catch (FormatException)
        {
            return false;
        }
    }

    private static string GenerateToken() =>
        Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)).Replace('+', '-').Replace('/', '_').TrimEnd('=');

    private static string HashToken(string token) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token))).ToLowerInvariant();

    private EmailMessage BuildInvitationEmail(string to, string businessName, string token, DateTimeOffset expiresAt)
    {
        var frontendBaseUrl = configuration["Frontend:BaseUrl"] ?? "http://localhost:3000";
        var link = $"{frontendBaseUrl}/invitations/{token}";
        var expires = expiresAt.ToString("d MMM yyyy");
        var subject = $"You've been invited to join {businessName}";

        var plain = $"You have been invited to help manage {businessName} on Invoice Generator.\n\n"
            + $"Accept the invitation: {link}\n\n"
            + $"Sign in or create an account with this email address to accept. The link expires on {expires}.";
        var html = $"<p>You have been invited to help manage <strong>{WebUtility.HtmlEncode(businessName)}</strong> on Invoice Generator.</p>"
            + $"<p><a href=\"{WebUtility.HtmlEncode(link)}\">Accept the invitation</a></p>"
            + $"<p>Sign in or create an account with this email address to accept. The link expires on {WebUtility.HtmlEncode(expires)}.</p>";

        return new EmailMessage([to], [], subject, plain, html, []);
    }

    private static BusinessInvitationDto ToDto(BusinessInvitation invitation) =>
        new(invitation.Id, invitation.Email, invitation.Role, invitation.CreatedAt, invitation.ExpiresAt);
}
