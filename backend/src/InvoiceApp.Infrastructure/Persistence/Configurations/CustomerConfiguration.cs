using InvoiceApp.Domain.Businesses;
using InvoiceApp.Domain.Customers;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace InvoiceApp.Infrastructure.Persistence.Configurations;

public sealed class CustomerConfiguration : IEntityTypeConfiguration<Customer>
{
    public void Configure(EntityTypeBuilder<Customer> builder)
    {
        builder.ToTable("customers", "customer");

        builder.HasKey(customer => customer.Id);

        builder.Property(customer => customer.BusinessName).HasMaxLength(200);
        builder.Property(customer => customer.ContactName).HasMaxLength(200);
        builder.Property(customer => customer.Email).HasMaxLength(320);
        builder.Property(customer => customer.Phone).HasMaxLength(50);
        builder.Property(customer => customer.AddressLine1).HasMaxLength(200);
        builder.Property(customer => customer.AddressLine2).HasMaxLength(200);
        builder.Property(customer => customer.City).HasMaxLength(100);
        builder.Property(customer => customer.State).HasMaxLength(100);
        builder.Property(customer => customer.PostalCode).HasMaxLength(20);
        builder.Property(customer => customer.Country).HasMaxLength(2);
        builder.Property(customer => customer.TaxNumber).HasMaxLength(100);
        builder.Property(customer => customer.IsArchived).IsRequired();
        builder.Property(customer => customer.CreatedAt).IsRequired();
        builder.Property(customer => customer.UpdatedAt).IsRequired();

        builder.HasIndex(customer => customer.BusinessId);
        builder.HasIndex(customer => new { customer.BusinessId, customer.IsArchived });

        builder.HasOne<Business>()
            .WithMany()
            .HasForeignKey(customer => customer.BusinessId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
