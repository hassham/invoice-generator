using InvoiceApp.Domain.Invoicing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace InvoiceApp.Infrastructure.Persistence.Configurations;

public sealed class RecurringScheduleConfiguration : IEntityTypeConfiguration<RecurringSchedule>
{
    public void Configure(EntityTypeBuilder<RecurringSchedule> builder)
    {
        builder.ToTable("recurring_schedules", "invoicing");

        builder.HasKey(rs => rs.Id);

        builder.Property(rs => rs.BusinessId).IsRequired();
        builder.Property(rs => rs.CustomerId).IsRequired();
        builder.Property(rs => rs.InvoiceTemplateId).IsRequired();
        builder.Property(rs => rs.Frequency).HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(rs => rs.StartDate).IsRequired();
        builder.Property(rs => rs.EndDate);
        builder.Property(rs => rs.NextRunDate).IsRequired();
        builder.Property(rs => rs.AutoSend).IsRequired();
        builder.Property(rs => rs.IsActive).IsRequired();
        builder.Property(rs => rs.IsDeleted).IsRequired();
        builder.Property(rs => rs.DeletedAt);
        builder.Property(rs => rs.CreatedAt).IsRequired();
        builder.Property(rs => rs.UpdatedAt).IsRequired();

        builder.HasIndex(rs => rs.BusinessId);
        builder.HasIndex(rs => rs.CustomerId);
        builder.HasIndex(rs => new { rs.BusinessId, rs.IsDeleted });
        builder.HasIndex(rs => rs.NextRunDate);
    }
}
