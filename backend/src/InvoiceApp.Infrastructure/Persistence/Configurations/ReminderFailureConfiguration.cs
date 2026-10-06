using InvoiceApp.Domain.Invoicing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace InvoiceApp.Infrastructure.Persistence.Configurations;

public sealed class ReminderFailureConfiguration : IEntityTypeConfiguration<ReminderFailure>
{
    public void Configure(EntityTypeBuilder<ReminderFailure> builder)
    {
        builder.ToTable("reminder_failures", "invoicing");

        builder.HasKey(r => r.Id);

        builder.Property(r => r.FailureReason).HasMaxLength(500).IsRequired();

        builder.HasIndex(r => new { r.InvoiceId, r.ReminderRuleId });
        builder.HasIndex(r => new { r.IsResolved, r.CreatedAt });
    }
}
