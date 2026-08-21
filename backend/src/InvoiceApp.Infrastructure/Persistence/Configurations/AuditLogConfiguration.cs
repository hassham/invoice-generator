using InvoiceApp.Domain.Audit;
using InvoiceApp.Domain.Businesses;
using InvoiceApp.Infrastructure.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace InvoiceApp.Infrastructure.Persistence.Configurations;

public sealed class AuditLogConfiguration : IEntityTypeConfiguration<AuditLog>
{
    public void Configure(EntityTypeBuilder<AuditLog> builder)
    {
        builder.ToTable("audit_logs", "audit");

        builder.HasKey(log => log.Id);

        builder.Property(log => log.EntityType).HasMaxLength(100).IsRequired();
        builder.Property(log => log.Action).HasMaxLength(100).IsRequired();
        builder.Property(log => log.Metadata).HasColumnType("jsonb");
        builder.Property(log => log.IpAddress).HasMaxLength(45);
        builder.Property(log => log.Timestamp).IsRequired();

        builder.HasIndex(log => new { log.BusinessId, log.Timestamp });
        builder.HasIndex(log => new { log.EntityType, log.EntityId });

        builder.HasOne<ApplicationUser>()
            .WithMany()
            .HasForeignKey(log => log.UserId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne<Business>()
            .WithMany()
            .HasForeignKey(log => log.BusinessId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
