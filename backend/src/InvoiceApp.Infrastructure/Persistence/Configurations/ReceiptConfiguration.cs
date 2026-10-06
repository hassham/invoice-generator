using InvoiceApp.Domain.Payments;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace InvoiceApp.Infrastructure.Persistence.Configurations;

public sealed class ReceiptConfiguration : IEntityTypeConfiguration<Receipt>
{
    public void Configure(EntityTypeBuilder<Receipt> builder)
    {
        builder.ToTable("receipts", "payments");

        builder.HasKey(r => r.Id);

        builder.Property(r => r.ReceiptNumber).HasMaxLength(50).IsRequired();
        builder.Property(r => r.InvoiceNumber).HasMaxLength(50).IsRequired();
        builder.Property(r => r.Currency).HasMaxLength(3).IsRequired();
        builder.Property(r => r.BusinessName).HasMaxLength(500).IsRequired();
        builder.Property(r => r.BusinessEmail).HasMaxLength(255);
        builder.Property(r => r.PaymentReference).HasMaxLength(255);

        builder.HasIndex(r => r.BusinessId);
        builder.HasIndex(r => r.InvoiceId);
        builder.HasIndex(r => r.PaymentId);
        builder.HasIndex(r => new { r.BusinessId, r.IssueDate });
    }
}
