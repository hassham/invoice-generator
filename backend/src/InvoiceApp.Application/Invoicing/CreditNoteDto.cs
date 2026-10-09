using InvoiceApp.Application.Documents;

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

    /// <summary>IG-308: maps a stored credit note onto the shared document engine, the same way
    /// estimates (IG-220) and purchase orders (IG-306) already render.</summary>
    Task<InvoicePdfRequest> GetPdfRequestAsync(
        Guid userId,
        Guid businessId,
        Guid creditNoteId,
        CancellationToken cancellationToken);
}

public record CreateCreditNoteCommand(
    Guid InvoiceId,
    decimal Amount,
    string Reason,
    string? Notes,
    // IG-309 / IG-234 AC 3: "the amount may exceed the invoice's amount due with explicit
    // confirmation". Appended with a default of false so the refusal stays the default - nothing
    // that exists today starts silently over-crediting because a caller omitted the flag.
    bool ConfirmedOverAmountDue = false
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
