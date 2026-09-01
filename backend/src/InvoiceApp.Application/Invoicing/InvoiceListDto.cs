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

/// <summary>FSD section 48's 5 sort options.</summary>
public enum InvoiceSortOption
{
    Newest,
    Oldest,
    AmountHighest,
    AmountLowest,
    DueDate,
}

/// <summary>
/// IG-62/IG-63: every criterion is optional and combines with AND - all null/default means
/// exactly IG-62's original behavior (no filters, newest first). `Search` (FSD section 46) matches
/// Invoice Number, Reference, and the linked customer's Business Name/Contact Name/Email.
/// `StartDate`/`EndDate` (FSD section 47's Date filter) scope by issue date, same convention as
/// the dashboard's period filter (IG-60).
/// </summary>
public sealed record InvoiceListQuery(
    int Page,
    int PageSize,
    string? Search,
    InvoiceStatus? Status,
    DateOnly? StartDate,
    DateOnly? EndDate,
    Guid? CustomerId,
    InvoiceSortOption Sort);
