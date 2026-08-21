using InvoiceApp.Domain.Businesses;
using InvoiceApp.Domain.Customers;
using InvoiceApp.Domain.Documents;
using InvoiceApp.Domain.Invoicing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace InvoiceApp.Infrastructure.Persistence.Configurations;

public sealed class InvoiceConfiguration : IEntityTypeConfiguration<Invoice>
{
    public void Configure(EntityTypeBuilder<Invoice> builder)
    {
        builder.ToTable("invoices", "invoice");

        builder.HasKey(invoice => invoice.Id);

        builder.Property(invoice => invoice.InvoiceNumber).HasMaxLength(50).IsRequired();
        builder.Property(invoice => invoice.Status).HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(invoice => invoice.Currency).HasMaxLength(3).IsRequired();
        builder.Property(invoice => invoice.Reference).HasMaxLength(100);
        builder.Property(invoice => invoice.CustomerSnapshot).HasColumnType("jsonb").IsRequired();
        builder.Property(invoice => invoice.SellerSnapshot).HasColumnType("jsonb").IsRequired();
        builder.Property(invoice => invoice.DiscountType).HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(invoice => invoice.DiscountValue).HasColumnType("decimal(19,4)");
        builder.Property(invoice => invoice.Subtotal).HasColumnType("decimal(19,4)").IsRequired();
        builder.Property(invoice => invoice.DiscountAmount).HasColumnType("decimal(19,4)").IsRequired();
        builder.Property(invoice => invoice.TaxAmount).HasColumnType("decimal(19,4)").IsRequired();
        builder.Property(invoice => invoice.TotalAmount).HasColumnType("decimal(19,4)").IsRequired();
        builder.Property(invoice => invoice.AmountPaid).HasColumnType("decimal(19,4)").IsRequired();
        builder.Property(invoice => invoice.AmountDue).HasColumnType("decimal(19,4)").IsRequired();
        builder.Property(invoice => invoice.TemplateSettings).HasColumnType("jsonb");
        builder.Property(invoice => invoice.IsDeleted).IsRequired();
        builder.Property(invoice => invoice.CreatedAt).IsRequired();
        builder.Property(invoice => invoice.UpdatedAt).IsRequired();

        builder.HasIndex(invoice => new { invoice.BusinessId, invoice.InvoiceNumber }).IsUnique();
        builder.HasIndex(invoice => invoice.BusinessId);
        builder.HasIndex(invoice => invoice.CustomerId);
        builder.HasIndex(invoice => invoice.Status);
        builder.HasIndex(invoice => invoice.DueDate);
        builder.HasIndex(invoice => invoice.IsDeleted);

        builder.HasOne<Business>()
            .WithMany()
            .HasForeignKey(invoice => invoice.BusinessId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<Customer>()
            .WithMany()
            .HasForeignKey(invoice => invoice.CustomerId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<Template>()
            .WithMany()
            .HasForeignKey(invoice => invoice.TemplateId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasMany(invoice => invoice.Items)
            .WithOne()
            .HasForeignKey(item => item.InvoiceId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
