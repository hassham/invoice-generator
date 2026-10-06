namespace InvoiceApp.Application.Invoicing;

public interface ICreditNoteService
{
    Task<CreditNoteDto> CreateAsync(
        Guid userId,
        Guid businessId,
        CreateCreditNoteCommand command,
        CancellationToken cancellationToken);

    Task<List<CreditNoteDto>> ListByInvoiceAsync(
        Guid userId,
        Guid businessId,
        Guid invoiceId,
        CancellationToken cancellationToken);

    Task<List<CreditNoteDto>> ListByBusinessAsync(
        Guid userId,
        Guid businessId,
        CancellationToken cancellationToken);

    Task<CreditNoteDto> GetAsync(
        Guid userId,
        Guid businessId,
        Guid creditNoteId,
        CancellationToken cancellationToken);

    Task DeleteAsync(
        Guid userId,
        Guid businessId,
        Guid creditNoteId,
        CancellationToken cancellationToken);
}

public record CreateCreditNoteCommand(
    Guid InvoiceId,
    decimal Amount,
    string Reason,
    string? Notes
);

public record CreditNoteDto(
    Guid Id,
    Guid InvoiceId,
    Guid CustomerId,
    string CreditNoteNumber,
    DateOnly IssueDate,
    string Reason,
    string Currency,
    decimal Amount,
    string Notes,
    DateTimeOffset CreatedAt
);
