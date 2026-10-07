using InvoiceApp.Domain.Purchasing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace InvoiceApp.Infrastructure.Persistence.Configurations;

public sealed class PurchaseOrderConfiguration : IEntityTypeConfiguration<PurchaseOrder>
{
    public void Configure(EntityTypeBuilder<PurchaseOrder> builder)
    {
        builder.ToTable("purchase_orders", "purchasing");

        builder.HasKey(po => po.Id);

        builder.Property(po => po.PONumber).HasMaxLength(50).IsRequired();
        builder.Property(po => po.Currency).HasMaxLength(3).IsRequired();
        builder.Property(po => po.SupplierSnapshot).IsRequired();
        builder.Property(po => po.BusinessSnapshot).IsRequired();

        builder.HasIndex(po => po.BusinessId);
        builder.HasIndex(po => po.SupplierId);
        builder.HasIndex(po => new { po.BusinessId, po.IssueDate });
        builder.HasIndex(po => new { po.BusinessId, po.PONumber }).IsUnique();

        builder.HasMany(po => po.Items)
            .WithOne()
            .HasForeignKey(item => item.PurchaseOrderId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
