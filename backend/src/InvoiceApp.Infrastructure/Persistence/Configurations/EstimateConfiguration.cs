using InvoiceApp.Domain.Businesses;
using InvoiceApp.Domain.Customers;
using InvoiceApp.Domain.Documents;
using InvoiceApp.Domain.Estimates;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace InvoiceApp.Infrastructure.Persistence.Configurations;

public sealed class EstimateConfiguration : IEntityTypeConfiguration<Estimate>
{
    public void Configure(EntityTypeBuilder<Estimate> builder)
    {
        builder.ToTable("estimates", "estimate");

        builder.HasKey(estimate => estimate.Id);

        builder.Property(estimate => estimate.EstimateNumber).HasMaxLength(50).IsRequired();
        builder.Property(estimate => estimate.Status).HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(estimate => estimate.Currency).HasMaxLength(3).IsRequired();
        builder.Property(estimate => estimate.Reference).HasMaxLength(100);
        builder.Property(estimate => estimate.CustomerSnapshot).HasColumnType("jsonb").IsRequired();
        builder.Property(estimate => estimate.SellerSnapshot).HasColumnType("jsonb").IsRequired();
        builder.Property(estimate => estimate.DiscountType).HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(estimate => estimate.DiscountValue).HasColumnType("decimal(19,4)");
        builder.Property(estimate => estimate.Subtotal).HasColumnType("decimal(19,4)").IsRequired();
        builder.Property(estimate => estimate.DiscountAmount).HasColumnType("decimal(19,4)").IsRequired();
        builder.Property(estimate => estimate.TaxAmount).HasColumnType("decimal(19,4)").IsRequired();
        builder.Property(estimate => estimate.TotalAmount).HasColumnType("decimal(19,4)").IsRequired();
        builder.Property(estimate => estimate.TemplateSettings).HasColumnType("jsonb");
        builder.Property(estimate => estimate.PublicToken).HasMaxLength(32);
        builder.Property(estimate => estimate.IsDeleted).IsRequired();
        builder.Property(estimate => estimate.CreatedAt).IsRequired();
        builder.Property(estimate => estimate.UpdatedAt).IsRequired();

        builder.HasIndex(estimate => new { estimate.BusinessId, estimate.EstimateNumber }).IsUnique();
        // Postgres treats each NULL as distinct for uniqueness purposes, same precedent as
        // Invoice.PublicToken's own index - estimates saved before IG-221 simply have none.
        builder.HasIndex(estimate => estimate.PublicToken).IsUnique();
        builder.HasIndex(estimate => estimate.BusinessId);
        builder.HasIndex(estimate => estimate.CustomerId);
        builder.HasIndex(estimate => estimate.Status);
        builder.HasIndex(estimate => estimate.IsDeleted);

        builder.HasOne<Business>()
            .WithMany()
            .HasForeignKey(estimate => estimate.BusinessId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<Customer>()
            .WithMany()
            .HasForeignKey(estimate => estimate.CustomerId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<Template>()
            .WithMany()
            .HasForeignKey(estimate => estimate.TemplateId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasMany(estimate => estimate.Items)
            .WithOne()
            .HasForeignKey(item => item.EstimateId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
