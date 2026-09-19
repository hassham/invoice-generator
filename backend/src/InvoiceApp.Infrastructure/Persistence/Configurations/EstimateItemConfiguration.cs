using InvoiceApp.Domain.Estimates;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace InvoiceApp.Infrastructure.Persistence.Configurations;

public sealed class EstimateItemConfiguration : IEntityTypeConfiguration<EstimateItem>
{
    public void Configure(EntityTypeBuilder<EstimateItem> builder)
    {
        builder.ToTable("estimate_items", "estimate");

        builder.HasKey(item => item.Id);

        builder.Property(item => item.Description).HasMaxLength(500).IsRequired();
        builder.Property(item => item.Quantity).HasColumnType("decimal(18,4)").IsRequired();
        builder.Property(item => item.Unit).HasMaxLength(50);
        builder.Property(item => item.UnitPrice).HasColumnType("decimal(19,4)").IsRequired();
        builder.Property(item => item.TaxRate).HasColumnType("decimal(9,4)").IsRequired();
        builder.Property(item => item.Discount).HasColumnType("decimal(19,4)").IsRequired();
        builder.Property(item => item.LineSubtotal).HasColumnType("decimal(19,4)").IsRequired();
        builder.Property(item => item.TaxAmount).HasColumnType("decimal(19,4)").IsRequired();
        builder.Property(item => item.LineTotal).HasColumnType("decimal(19,4)").IsRequired();
        builder.Property(item => item.SortOrder).IsRequired();

        builder.HasIndex(item => item.EstimateId);
    }
}
