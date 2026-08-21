using InvoiceApp.Domain.Invoicing;
using InvoiceApp.Domain.Payments;
using InvoiceApp.Infrastructure.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace InvoiceApp.Infrastructure.Persistence.Configurations;

public sealed class PaymentConfiguration : IEntityTypeConfiguration<Payment>
{
    public void Configure(EntityTypeBuilder<Payment> builder)
    {
        builder.ToTable("payments", "payment");

        builder.HasKey(payment => payment.Id);

        builder.Property(payment => payment.Amount).HasColumnType("decimal(19,4)").IsRequired();
        builder.Property(payment => payment.PaymentMethod).HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(payment => payment.Reference).HasMaxLength(200);
        builder.Property(payment => payment.CreatedAt).IsRequired();

        builder.HasIndex(payment => payment.InvoiceId);

        builder.HasOne<Invoice>()
            .WithMany()
            .HasForeignKey(payment => payment.InvoiceId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<ApplicationUser>()
            .WithMany()
            .HasForeignKey(payment => payment.CreatedBy)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
