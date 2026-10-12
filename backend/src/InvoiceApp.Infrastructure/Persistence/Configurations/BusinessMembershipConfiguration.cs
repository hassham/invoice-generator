using InvoiceApp.Domain.Businesses;
using InvoiceApp.Infrastructure.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace InvoiceApp.Infrastructure.Persistence.Configurations;

public sealed class BusinessMembershipConfiguration : IEntityTypeConfiguration<BusinessMembership>
{
    public void Configure(EntityTypeBuilder<BusinessMembership> builder)
    {
        builder.ToTable("business_memberships", "business");

        builder.HasKey(membership => membership.Id);

        builder.Property(membership => membership.CreatedAt).IsRequired();

        // One row per (business, user). Re-inviting a revoked member reactivates this row rather than
        // inserting a second one, so the unique index holds across the membership's whole history.
        builder.HasIndex(membership => new { membership.BusinessId, membership.UserId }).IsUnique();
        builder.HasIndex(membership => membership.UserId);

        builder.HasOne<Business>()
            .WithMany()
            .HasForeignKey(membership => membership.BusinessId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<ApplicationUser>()
            .WithMany()
            .HasForeignKey(membership => membership.UserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
