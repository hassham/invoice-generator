using InvoiceApp.Domain.Invoicing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace InvoiceApp.Infrastructure.Persistence.Configurations;

public sealed class ReminderSentConfiguration : IEntityTypeConfiguration<ReminderSent>
{
    public void Configure(EntityTypeBuilder<ReminderSent> builder)
    {
        builder.ToTable("reminders_sent", "invoicing");

        builder.HasKey(r => r.Id);

        builder.HasIndex(r => new { r.InvoiceId, r.ReminderRuleId }).IsUnique();
        builder.HasIndex(r => r.InvoiceId);
    }
}
