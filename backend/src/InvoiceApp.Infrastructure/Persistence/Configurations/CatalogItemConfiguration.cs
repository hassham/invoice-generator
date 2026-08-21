using InvoiceApp.Domain.Businesses;
using InvoiceApp.Domain.Catalog;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace InvoiceApp.Infrastructure.Persistence.Configurations;

public sealed class CatalogItemConfiguration : IEntityTypeConfiguration<CatalogItem>
{
    public void Configure(EntityTypeBuilder<CatalogItem> builder)
    {
        builder.ToTable("items", "catalog");

        builder.HasKey(item => item.Id);

        builder.Property(item => item.Name).HasMaxLength(200).IsRequired();
        builder.Property(item => item.SKU).HasMaxLength(100);
        builder.Property(item => item.Unit).HasMaxLength(50);
        builder.Property(item => item.UnitPrice).HasColumnType("decimal(19,4)");
        builder.Property(item => item.TaxRate).HasColumnType("decimal(9,4)");
        builder.Property(item => item.IsArchived).IsRequired();
        builder.Property(item => item.CreatedAt).IsRequired();
        builder.Property(item => item.UpdatedAt).IsRequired();

        builder.HasIndex(item => item.BusinessId);

        builder.HasOne<Business>()
            .WithMany()
            .HasForeignKey(item => item.BusinessId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
