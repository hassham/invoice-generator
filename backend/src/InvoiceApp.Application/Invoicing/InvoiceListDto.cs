using InvoiceApp.Domain.Invoicing;

namespace InvoiceApp.Application.Invoicing;

/// <summary>FSD section 45's Invoice List columns: Invoice Number, Customer, Date, Due Date,
/// Amount, Amount Due, Status.</summary>
public sealed record InvoiceListItemDto(
    Guid Id,
    string InvoiceNumber,
    string CustomerName,
    InvoiceStatus Status,
    DateOnly IssueDate,
    DateOnly DueDate,
    string Currency,
    decimal TotalAmount,
    decimal AmountDue);

/// <summary>FSD section 112: 25/50/100 records per page, offset-based (page number) pagination -
/// "cursor-based for larger datasets" is explicitly a Future item, not MVP.</summary>
public sealed record InvoiceListResponse(
    IReadOnlyList<InvoiceListItemDto> Items,
    int Page,
    int PageSize,
    int TotalCount);
