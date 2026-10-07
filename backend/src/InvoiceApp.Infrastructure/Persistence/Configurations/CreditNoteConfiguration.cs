using InvoiceApp.Domain.Invoicing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace InvoiceApp.Infrastructure.Persistence.Configurations;

public sealed class CreditNoteConfiguration : IEntityTypeConfiguration<CreditNote>
{
    public void Configure(EntityTypeBuilder<CreditNote> builder)
    {
        builder.ToTable("credit_notes", "invoicing");

        builder.HasKey(cn => cn.Id);

        builder.Property(cn => cn.CreditNoteNumber).HasMaxLength(50).IsRequired();
        builder.Property(cn => cn.Reason).HasMaxLength(500).IsRequired();
        builder.Property(cn => cn.Currency).HasMaxLength(3).IsRequired();
        builder.Property(cn => cn.Notes).HasMaxLength(2000).IsRequired();
        builder.Property(cn => cn.SellerSnapshot).HasMaxLength(2000).IsRequired();
        builder.Property(cn => cn.CustomerSnapshot).HasMaxLength(2000).IsRequired();

        builder.HasIndex(cn => cn.BusinessId);
        builder.HasIndex(cn => cn.InvoiceId);
        builder.HasIndex(cn => cn.CustomerId);
        builder.HasIndex(cn => new { cn.BusinessId, cn.IsDeleted });

        // An accounting number must identify exactly one document. Soft-deleted rows are included
        // deliberately: a deleted credit note's number must never be reissued (IG-234).
        builder.HasIndex(cn => new { cn.BusinessId, cn.CreditNoteNumber }).IsUnique();
    }
}
