using InvoiceApp.Domain.Documents;
using InvoiceApp.Domain.Invoicing;
using InvoiceApp.Infrastructure.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace InvoiceApp.Infrastructure.Persistence.Configurations;

public sealed class GeneratedDocumentConfiguration : IEntityTypeConfiguration<GeneratedDocument>
{
    public void Configure(EntityTypeBuilder<GeneratedDocument> builder)
    {
        builder.ToTable("generated_documents", "document");

        builder.HasKey(document => document.Id);

        builder.Property(document => document.FileName).HasMaxLength(255).IsRequired();
        builder.Property(document => document.ContentType).HasMaxLength(100).IsRequired();
        builder.Property(document => document.StorageKey).HasMaxLength(500).IsRequired();
        builder.Property(document => document.GeneratedAt).IsRequired();

        builder.HasIndex(document => document.InvoiceId);

        builder.HasOne<Invoice>()
            .WithMany()
            .HasForeignKey(document => document.InvoiceId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<ApplicationUser>()
            .WithMany()
            .HasForeignKey(document => document.GeneratedByUserId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
