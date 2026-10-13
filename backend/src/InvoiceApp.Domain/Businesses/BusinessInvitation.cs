namespace InvoiceApp.Domain.Businesses;

/// <summary>
/// IG-239 / IG-297 / IG-298: an owner's invitation to an email address to join one business. Only a
/// SHA-256 hash of the token is stored; the raw token exists only in the invitation email. An invite
/// is pending until it is accepted, cancelled or expires.
/// </summary>
public sealed class BusinessInvitation
{
    public Guid Id { get; set; }

    public Guid BusinessId { get; set; }

    /// <summary>Lowercased. Acceptance requires the signed-in account's email to match this exactly.</summary>
    public string Email { get; set; } = string.Empty;

    public string TokenHash { get; set; } = string.Empty;

    public Guid InvitedByUserId { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset ExpiresAt { get; set; }

    public DateTimeOffset? AcceptedAt { get; set; }

    public Guid? AcceptedByUserId { get; set; }

    public DateTimeOffset? CancelledAt { get; set; }

    /// <summary>IG-240: the role the member gets on acceptance. The owner chooses it when inviting.</summary>
    public BusinessRole Role { get; set; } = BusinessRole.Restricted;
}
