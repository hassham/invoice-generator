namespace InvoiceApp.Application.Documents;

/// <summary>
/// IG-237: the document types that can appear on the unified document list. Deliberately an enum
/// rather than a free string so the API rejects an unknown type instead of silently returning
/// everything, and so adding a sixth type is a compile-time change here rather than a guess at the
/// call site.
/// </summary>
public enum DocumentType
{
    Invoice,
    Estimate,
    CreditNote,
    Receipt,
    PurchaseOrder,
}

public enum DocumentSortOption
{
    Newest,
    Oldest,
    AmountHighest,
    AmountLowest,
}

/// <summary>
/// One row of the unified list. This is the common shape five different documents collapse into,
/// so it holds only what every type can actually answer: who it is addressed to, when it was
/// issued, and what it is worth. <paramref name="Status"/> is null for the types that have no
/// lifecycle of their own (credit notes, receipts, purchase orders) rather than inventing one.
/// </summary>
public sealed record DocumentSummaryDto(
    Guid Id,
    DocumentType DocumentType,
    string DocumentNumber,
    string PartyName,
    DateOnly IssueDate,
    string Currency,
    decimal TotalAmount,
    string? Status);

public sealed record DocumentListQuery(
    int Page = 1,
    int PageSize = 25,
    string? Search = null,
    DocumentType? DocumentType = null,
    DateOnly? StartDate = null,
    DateOnly? EndDate = null,
    DocumentSortOption Sort = DocumentSortOption.Newest);

public sealed record DocumentListResponse(
    IReadOnlyList<DocumentSummaryDto> Items,
    int Page,
    int PageSize,
    int TotalCount);

public interface IDocumentListService
{
    Task<DocumentListResponse> ListAsync(Guid userId, DocumentListQuery query, CancellationToken cancellationToken);
}
