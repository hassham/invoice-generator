namespace InvoiceApp.Application.Businesses;

/// <summary>An invitation as the owner sees it. The raw token is never returned: it exists only in the email.</summary>
public sealed record BusinessInvitationDto(Guid Id, string Email, DateTimeOffset CreatedAt, DateTimeOffset ExpiresAt);

public sealed record BusinessMemberDto(Guid Id, Guid UserId, string Email, DateTimeOffset JoinedAt);

public sealed record BusinessTeamDto(IReadOnlyList<BusinessInvitationDto> PendingInvitations, IReadOnlyList<BusinessMemberDto> Members);

/// <summary>What an invitee sees before and after accepting.</summary>
public sealed record InvitationDto(Guid BusinessId, string BusinessName, string Email, DateTimeOffset ExpiresAt);

public sealed record InviteBusinessMemberRequest(string Email);

/// <summary>
/// IG-239 / IG-297 / IG-298: owners invite people by email to one business, see and cancel pending
/// invitations, and revoke members. Invitees accept while signed in with the invited email.
/// Only the business owner manages the team; IG-240 will add restricted roles.
/// </summary>
public interface IBusinessInvitationService
{
    Task<BusinessInvitationDto> InviteAsync(Guid userId, Guid businessId, InviteBusinessMemberRequest request, CancellationToken cancellationToken);

    Task<BusinessTeamDto> GetTeamAsync(Guid userId, Guid businessId, CancellationToken cancellationToken);

    /// <summary>Cancels a pending invitation. A non-pending one (accepted, cancelled or expired) is a conflict.</summary>
    Task CancelInvitationAsync(Guid userId, Guid businessId, Guid invitationId, CancellationToken cancellationToken);

    /// <summary>Revokes a member's access. The membership row is kept for history.</summary>
    Task RemoveMemberAsync(Guid userId, Guid businessId, Guid membershipId, CancellationToken cancellationToken);

    /// <summary>Shows an invitation to the signed-in user whose email it was sent to.</summary>
    Task<InvitationDto> GetInvitationAsync(Guid userId, string token, CancellationToken cancellationToken);

    /// <summary>Accepts an invitation. Idempotent for the user who already accepted it.</summary>
    Task<InvitationDto> AcceptInvitationAsync(Guid userId, string token, CancellationToken cancellationToken);
}
