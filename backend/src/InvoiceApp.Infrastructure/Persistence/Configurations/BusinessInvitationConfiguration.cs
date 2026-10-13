using InvoiceApp.Domain.Businesses;
using InvoiceApp.Infrastructure.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace InvoiceApp.Infrastructure.Persistence.Configurations;

public sealed class BusinessInvitationConfiguration : IEntityTypeConfiguration<BusinessInvitation>
{
    public void Configure(EntityTypeBuilder<BusinessInvitation> builder)
    {
        builder.ToTable("business_invitations", "business");

        builder.HasKey(invitation => invitation.Id);

        builder.Property(invitation => invitation.Email).HasMaxLength(320).IsRequired();
        builder.Property(invitation => invitation.TokenHash).HasMaxLength(64).IsRequired();
        builder.Property(invitation => invitation.CreatedAt).IsRequired();
        builder.Property(invitation => invitation.ExpiresAt).IsRequired();
        builder.Property(invitation => invitation.Role).HasConversion<string>().HasMaxLength(20).IsRequired();

        builder.HasIndex(invitation => invitation.TokenHash).IsUnique();
        builder.HasIndex(invitation => new { invitation.BusinessId, invitation.Email });

        builder.HasOne<Business>()
            .WithMany()
            .HasForeignKey(invitation => invitation.BusinessId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<ApplicationUser>()
            .WithMany()
            .HasForeignKey(invitation => invitation.InvitedByUserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
