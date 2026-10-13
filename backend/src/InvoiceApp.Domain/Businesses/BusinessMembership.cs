namespace InvoiceApp.Domain.Businesses;

/// <summary>
/// IG-239: a user other than the owner who may work in one business. Revoking sets RevokedAt and
/// keeps the row, so the history of who had access, and when, is not lost. The owner is
/// Business.UserId and is never represented here.
/// </summary>
public sealed class BusinessMembership
{
    public Guid Id { get; set; }

    public Guid BusinessId { get; set; }

    public Guid UserId { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset? RevokedAt { get; set; }

    /// <summary>IG-240: Restricted by default. Changed only by the owner.</summary>
    public BusinessRole Role { get; set; } = BusinessRole.Restricted;
}
