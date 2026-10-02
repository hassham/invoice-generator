using InvoiceApp.Domain.Invoicing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace InvoiceApp.Infrastructure.Persistence.Configurations;

public sealed class ReminderRuleConfiguration : IEntityTypeConfiguration<ReminderRule>
{
    public void Configure(EntityTypeBuilder<ReminderRule> builder)
    {
        builder.ToTable("reminder_rules", "invoicing");

        builder.HasKey(r => r.Id);

        builder.Property(r => r.EmailSubject).HasMaxLength(255).IsRequired();
        builder.Property(r => r.EmailBody).HasMaxLength(2000).IsRequired();

        builder.HasIndex(r => r.BusinessId);
        builder.HasIndex(r => new { r.BusinessId, r.IsActive });
    }
}
