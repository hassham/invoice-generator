using InvoiceApp.Domain.Documents;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace InvoiceApp.Infrastructure.Persistence.Configurations;

public sealed class TemplateConfiguration : IEntityTypeConfiguration<Template>
{
    public void Configure(EntityTypeBuilder<Template> builder)
    {
        builder.ToTable("templates", "document");

        builder.HasKey(template => template.Id);

        builder.Property(template => template.Name).HasMaxLength(100).IsRequired();
        builder.Property(template => template.TemplateCode).HasMaxLength(50).IsRequired();
        builder.Property(template => template.PreviewImage).HasMaxLength(500);
        builder.Property(template => template.IsPremium).IsRequired();
        builder.Property(template => template.IsActive).IsRequired();
        builder.Property(template => template.SortOrder).IsRequired();

        builder.HasIndex(template => template.TemplateCode).IsUnique();

        // Seeded via migration HasData (docs/DATABASE_SCHEMA.md section 9): the Templates page and
        // Business.DefaultTemplateId/Invoice.TemplateId both assume at least one template exists.
        // Ids are fixed literals, not Guid.NewGuid(), because HasData snapshots must be stable
        // across migration regenerations.
        builder.HasData(
            new Template
            {
                Id = Guid.Parse("8f6a1f2e-3b6f-4b8f-8f0a-000000000001"),
                Name = "Classic",
                TemplateCode = "classic",
                IsPremium = false,
                IsActive = true,
                SortOrder = 1,
            },
            new Template
            {
                Id = Guid.Parse("8f6a1f2e-3b6f-4b8f-8f0a-000000000002"),
                Name = "Modern",
                TemplateCode = "modern",
                IsPremium = false,
                IsActive = true,
                SortOrder = 2,
            },
            new Template
            {
                Id = Guid.Parse("8f6a1f2e-3b6f-4b8f-8f0a-000000000003"),
                Name = "Minimal",
                TemplateCode = "minimal",
                IsPremium = false,
                IsActive = true,
                SortOrder = 3,
            });
    }
}
