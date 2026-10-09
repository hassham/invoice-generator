using InvoiceApp.Domain.Invoicing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace InvoiceApp.Infrastructure.Persistence.Configurations;

public sealed class RecurringGenerationFailureConfiguration : IEntityTypeConfiguration<RecurringGenerationFailure>
{
    public void Configure(EntityTypeBuilder<RecurringGenerationFailure> builder)
    {
        builder.ToTable("recurring_generation_failures", "invoicing");

        builder.HasKey(f => f.Id);

        builder.Property(f => f.FailureReason).HasMaxLength(500).IsRequired();

        // The job looks a schedule's open failure up on every run, and the list endpoint reads
        // unresolved ones newest first - same two access paths as reminder_failures.
        builder.HasIndex(f => new { f.RecurringScheduleId, f.IsResolved });
        builder.HasIndex(f => new { f.IsResolved, f.CreatedAt });
    }
}
