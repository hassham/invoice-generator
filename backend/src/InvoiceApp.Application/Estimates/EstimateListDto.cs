using InvoiceApp.Domain.Estimates;

namespace InvoiceApp.Application.Estimates;

public sealed record EstimateListItemDto(
    Guid Id,
    string EstimateNumber,
    string CustomerName,
    EstimateStatus Status,
    DateOnly IssueDate,
    DateOnly ExpiryDate,
    string Currency,
    decimal TotalAmount);

public sealed record EstimateListResponse(
    IReadOnlyList<EstimateListItemDto> Items,
    int Page,
    int PageSize,
    int TotalCount);

/// <summary>Deliberately trimmed vs InvoiceListQuery for this first Story - no sort options/date
/// range/customer filter yet, matching IG-220's own scope boundary (create, save, view; browsing
/// polish is a natural fast-follow, not this Story's AC).</summary>
public sealed record EstimateListQuery(
    int Page,
    int PageSize,
    string? Search,
    EstimateStatus? Status);
