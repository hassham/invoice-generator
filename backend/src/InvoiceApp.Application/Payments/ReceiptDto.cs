using InvoiceApp.Domain.Payments;

namespace InvoiceApp.Application.Payments;

public interface IReceiptService
{
    Task<ReceiptDto> CreateAsync(
        Guid userId,
        Guid businessId,
        CreateReceiptCommand command,
        CancellationToken cancellationToken);

    Task<List<ReceiptDto>> ListByInvoiceAsync(
        Guid userId,
        Guid businessId,
        Guid invoiceId,
        CancellationToken cancellationToken);

    Task<List<ReceiptDto>> ListByBusinessAsync(
        Guid userId,
        Guid businessId,
        CancellationToken cancellationToken);

    Task<ReceiptDto> GetAsync(
        Guid userId,
        Guid businessId,
        Guid receiptId,
        CancellationToken cancellationToken);

    Task DeleteAsync(
        Guid userId,
        Guid businessId,
        Guid receiptId,
        CancellationToken cancellationToken);
}

public record CreateReceiptCommand(
    Guid PaymentId
);

public record ReceiptDto(
    Guid Id,
    Guid PaymentId,
    Guid InvoiceId,
    string ReceiptNumber,
    DateOnly IssueDate,
    decimal Amount,
    DateOnly PaymentDate,
    PaymentMethod PaymentMethod,
    string Currency,
    DateTimeOffset CreatedAt,
    string InvoiceNumber,
    string BusinessName,
    string? BusinessEmail = null
);
