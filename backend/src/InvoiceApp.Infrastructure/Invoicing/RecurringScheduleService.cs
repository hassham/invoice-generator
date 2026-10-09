using InvoiceApp.Application.Invoicing;
using InvoiceApp.Domain.Invoicing;
using InvoiceApp.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace InvoiceApp.Infrastructure.Invoicing;

public sealed class RecurringScheduleService(ApplicationDbContext dbContext) : IRecurringScheduleService
{
    public async Task<RecurringScheduleDto> CreateAsync(
        Guid userId,
        Guid businessId,
        CreateRecurringScheduleCommand command,
        CancellationToken cancellationToken)
    {
        var business = await dbContext.Businesses
            .FirstOrDefaultAsync(b => b.Id == businessId && b.UserId == userId, cancellationToken);

        if (business == null)
            throw new InvalidOperationException("Business not found or access denied.");

        var customer = await dbContext.Customers
            .FirstOrDefaultAsync(c => c.Id == command.CustomerId && c.BusinessId == businessId && !c.IsArchived, cancellationToken);

        if (customer == null)
            throw new InvalidOperationException("Customer not found.");

        var template = await dbContext.Invoices
            .FirstOrDefaultAsync(i => i.Id == command.InvoiceTemplateId && i.BusinessId == businessId && !i.IsDeleted, cancellationToken);

        if (template == null)
            throw new InvalidOperationException("Invoice template not found.");

        // IG-278: the frequency arrives as a string and must match one of the defined names.
        // Enum.TryParse alone is not enough - it also accepts the underlying numbers, so "3"
        // silently became Monthly, and "99" or "-1" succeeded outright and stored a value that is
        // not a real option at all (CalculateNextRunDate would then fall through to its monthly
        // default). Comparing against the parsed value's own name rejects every numeric form while
        // still allowing any casing.
        if (!Enum.TryParse<RecurringScheduleFrequency>(command.Frequency, ignoreCase: true, out var frequency)
            || !Enum.IsDefined(frequency)
            || !string.Equals(frequency.ToString(), command.Frequency?.Trim(), StringComparison.OrdinalIgnoreCase))
        {
            throw new ArgumentException($"Invalid frequency: {command.Frequency}");
        }

        if (command.EndDate.HasValue && command.EndDate <= command.StartDate)
            throw new ArgumentException("End date must be after start date.");

        var schedule = new RecurringSchedule
        {
            Id = Guid.NewGuid(),
            BusinessId = businessId,
            CustomerId = command.CustomerId,
            InvoiceTemplateId = command.InvoiceTemplateId,
            Frequency = frequency,
            StartDate = command.StartDate,
            EndDate = command.EndDate,
            NextRunDate = command.StartDate,
            AutoSend = command.AutoSend,
            IsActive = true,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };

        dbContext.RecurringSchedules.Add(schedule);
        await dbContext.SaveChangesAsync(cancellationToken);

        return MapToDto(schedule);
    }

    public async Task<List<RecurringScheduleDto>> ListByBusinessAsync(
        Guid userId,
        Guid businessId,
        CancellationToken cancellationToken)
    {
        var business = await dbContext.Businesses
            .FirstOrDefaultAsync(b => b.Id == businessId && b.UserId == userId, cancellationToken);

        if (business == null)
            throw new InvalidOperationException("Business not found or access denied.");

        var schedules = await dbContext.RecurringSchedules
            .Where(rs => rs.BusinessId == businessId && !rs.IsDeleted)
            .OrderByDescending(rs => rs.CreatedAt)
            .ToListAsync(cancellationToken);

        return schedules.Select(MapToDto).ToList();
    }

    public async Task<RecurringScheduleDto> GetAsync(
        Guid userId,
        Guid businessId,
        Guid scheduleId,
        CancellationToken cancellationToken)
    {
        var business = await dbContext.Businesses
            .FirstOrDefaultAsync(b => b.Id == businessId && b.UserId == userId, cancellationToken);

        if (business == null)
            throw new InvalidOperationException("Business not found or access denied.");

        var schedule = await dbContext.RecurringSchedules
            .FirstOrDefaultAsync(rs => rs.Id == scheduleId && rs.BusinessId == businessId && !rs.IsDeleted, cancellationToken);

        if (schedule == null)
            throw new InvalidOperationException("Recurring schedule not found.");

        return MapToDto(schedule);
    }

    public async Task<RecurringScheduleDto> PauseAsync(
        Guid userId,
        Guid businessId,
        Guid scheduleId,
        CancellationToken cancellationToken)
    {
        var business = await dbContext.Businesses
            .FirstOrDefaultAsync(b => b.Id == businessId && b.UserId == userId, cancellationToken);

        if (business == null)
            throw new InvalidOperationException("Business not found or access denied.");

        var schedule = await dbContext.RecurringSchedules
            .FirstOrDefaultAsync(rs => rs.Id == scheduleId && rs.BusinessId == businessId && !rs.IsDeleted, cancellationToken);

        if (schedule == null)
            throw new InvalidOperationException("Recurring schedule not found.");

        schedule.IsActive = false;
        schedule.UpdatedAt = DateTimeOffset.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);

        return MapToDto(schedule);
    }

    public async Task<RecurringScheduleDto> ResumeAsync(
        Guid userId,
        Guid businessId,
        Guid scheduleId,
        CancellationToken cancellationToken)
    {
        var business = await dbContext.Businesses
            .FirstOrDefaultAsync(b => b.Id == businessId && b.UserId == userId, cancellationToken);

        if (business == null)
            throw new InvalidOperationException("Business not found or access denied.");

        var schedule = await dbContext.RecurringSchedules
            .FirstOrDefaultAsync(rs => rs.Id == scheduleId && rs.BusinessId == businessId && !rs.IsDeleted, cancellationToken);

        if (schedule == null)
            throw new InvalidOperationException("Recurring schedule not found.");

        schedule.IsActive = true;
        schedule.UpdatedAt = DateTimeOffset.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);

        return MapToDto(schedule);
    }

    public async Task CancelAsync(
        Guid userId,
        Guid businessId,
        Guid scheduleId,
        CancellationToken cancellationToken)
    {
        var business = await dbContext.Businesses
            .FirstOrDefaultAsync(b => b.Id == businessId && b.UserId == userId, cancellationToken);

        if (business == null)
            throw new InvalidOperationException("Business not found or access denied.");

        var schedule = await dbContext.RecurringSchedules
            .FirstOrDefaultAsync(rs => rs.Id == scheduleId && rs.BusinessId == businessId && !rs.IsDeleted, cancellationToken);

        if (schedule == null)
            throw new InvalidOperationException("Recurring schedule not found.");

        schedule.IsDeleted = true;
        schedule.IsActive = false;
        schedule.DeletedAt = DateTimeOffset.UtcNow;
        schedule.UpdatedAt = DateTimeOffset.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private static RecurringScheduleDto MapToDto(RecurringSchedule schedule)
    {
        return new RecurringScheduleDto(
            schedule.Id,
            schedule.CustomerId,
            schedule.InvoiceTemplateId,
            schedule.Frequency.ToString(),
            schedule.StartDate,
            schedule.EndDate,
            schedule.NextRunDate,
            schedule.AutoSend,
            schedule.IsActive,
            schedule.CreatedAt);
    }
}
