using InvoiceApp.Domain.Businesses;
using InvoiceApp.Domain.Documents;
using InvoiceApp.Infrastructure.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace InvoiceApp.Infrastructure.Persistence.Configurations;

public sealed class BusinessConfiguration : IEntityTypeConfiguration<Business>
{
    public void Configure(EntityTypeBuilder<Business> builder)
    {
        builder.ToTable("businesses", "business");

        builder.HasKey(business => business.Id);

        builder.Property(business => business.BusinessName).HasMaxLength(200).IsRequired();
        builder.Property(business => business.LegalName).HasMaxLength(200);
        builder.Property(business => business.Email).HasMaxLength(320);
        builder.Property(business => business.Phone).HasMaxLength(50);
        builder.Property(business => business.Website).HasMaxLength(300);
        builder.Property(business => business.AddressLine1).HasMaxLength(200);
        builder.Property(business => business.AddressLine2).HasMaxLength(200);
        builder.Property(business => business.City).HasMaxLength(100);
        builder.Property(business => business.State).HasMaxLength(100);
        builder.Property(business => business.PostalCode).HasMaxLength(20);
        builder.Property(business => business.Country).HasMaxLength(2).IsRequired();
        builder.Property(business => business.RegistrationNumber).HasMaxLength(100);
        builder.Property(business => business.TaxNumber).HasMaxLength(100);
        builder.Property(business => business.DefaultCurrency).HasMaxLength(3).IsRequired();
        builder.Property(business => business.DefaultTaxRate).HasColumnType("decimal(9,4)");
        builder.Property(business => business.TaxCalculationMethod).HasConversion<string>().HasMaxLength(20);
        builder.Property(business => business.InvoicePrefix).HasMaxLength(20).IsRequired();
        builder.Property(business => business.DefaultPaymentTerms).HasConversion<string>().HasMaxLength(20);
        builder.Property(business => business.LogoUrl).HasMaxLength(500);
        builder.Property(business => business.CreatedAt).IsRequired();
        builder.Property(business => business.UpdatedAt).IsRequired();

        builder.HasIndex(business => business.UserId);

        builder.HasOne<ApplicationUser>()
            .WithMany()
            .HasForeignKey(business => business.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<Template>()
            .WithMany()
            .HasForeignKey(business => business.DefaultTemplateId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
