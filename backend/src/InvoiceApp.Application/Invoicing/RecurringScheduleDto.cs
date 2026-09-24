namespace InvoiceApp.Application.Invoicing;

public interface IRecurringScheduleService
{
    Task<RecurringScheduleDto> CreateAsync(
        Guid userId,
        Guid businessId,
        CreateRecurringScheduleCommand command,
        CancellationToken cancellationToken);

    Task<List<RecurringScheduleDto>> ListByBusinessAsync(
        Guid userId,
        Guid businessId,
        CancellationToken cancellationToken);

    Task<RecurringScheduleDto> GetAsync(
        Guid userId,
        Guid businessId,
        Guid scheduleId,
        CancellationToken cancellationToken);
}

public record CreateRecurringScheduleCommand(
    Guid CustomerId,
    Guid InvoiceTemplateId,
    string Frequency,
    DateOnly StartDate,
    DateOnly? EndDate,
    bool AutoSend
);

public record RecurringScheduleDto(
    Guid Id,
    Guid CustomerId,
    Guid InvoiceTemplateId,
    string Frequency,
    DateOnly StartDate,
    DateOnly? EndDate,
    DateOnly NextRunDate,
    bool AutoSend,
    bool IsActive,
    DateTimeOffset CreatedAt
);
