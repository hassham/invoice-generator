using InvoiceApp.Domain.Estimates;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace InvoiceApp.Infrastructure.Persistence.Configurations;

public sealed class EstimateEmailLogConfiguration : IEntityTypeConfiguration<EstimateEmailLog>
{
    public void Configure(EntityTypeBuilder<EstimateEmailLog> builder)
    {
        builder.ToTable("estimate_email_logs", "estimate");

        builder.HasKey(log => log.Id);

        builder.Property(log => log.SentAt).IsRequired();
        builder.Property(log => log.To).HasColumnType("jsonb").IsRequired();
        builder.Property(log => log.Cc).HasColumnType("jsonb").IsRequired();
        builder.Property(log => log.Subject).HasMaxLength(200).IsRequired();
        builder.Property(log => log.Status).HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(log => log.ErrorMessage).HasMaxLength(2000);

        builder.HasIndex(log => log.EstimateId);

        builder.HasOne<Estimate>()
            .WithMany()
            .HasForeignKey(log => log.EstimateId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
