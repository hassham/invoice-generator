using InvoiceApp.Domain.Invoicing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace InvoiceApp.Infrastructure.Persistence.Configurations;

public sealed class InvoiceEmailLogConfiguration : IEntityTypeConfiguration<InvoiceEmailLog>
{
    public void Configure(EntityTypeBuilder<InvoiceEmailLog> builder)
    {
        builder.ToTable("invoice_email_logs", "invoice");

        builder.HasKey(log => log.Id);

        builder.Property(log => log.SentAt).IsRequired();
        builder.Property(log => log.To).HasColumnType("jsonb").IsRequired();
        builder.Property(log => log.Cc).HasColumnType("jsonb").IsRequired();
        builder.Property(log => log.Subject).HasMaxLength(200).IsRequired();
        builder.Property(log => log.Status).HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(log => log.ErrorMessage).HasMaxLength(2000);

        builder.HasIndex(log => log.InvoiceId);

        builder.HasOne<Invoice>()
            .WithMany()
            .HasForeignKey(log => log.InvoiceId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
