using Microsoft.AspNetCore.Identity;

namespace InvoiceApp.Infrastructure.Identity;

/// <summary>
/// ASP.NET Core Identity is an Infrastructure/authentication concern (docs/SAD.md sections 11,
/// 14, 36), so this type lives here rather than in InvoiceApp.Domain, which must not depend on
/// ASP.NET Core (docs/SAD.md section 9; enforced by InvoiceApp.ArchitectureTests).
/// </summary>
public sealed class ApplicationUser : IdentityUser<Guid>
{
    public string? Name { get; set; }

    public string Status { get; set; } = "Active";

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }

    public DateTimeOffset? LastLoginAt { get; set; }
}
