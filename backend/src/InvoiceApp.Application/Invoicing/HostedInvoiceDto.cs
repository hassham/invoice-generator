using InvoiceApp.Domain.Invoicing;

namespace InvoiceApp.Application.Invoicing;

/// <summary>
/// IG-214: the hosted invoice page's view model - deliberately a narrower projection than
/// InvoiceDetailDto (no line items, discount breakdown, or payment instructions), matching docs/
/// PRD.md section 19's exact scope: "Business Logo, Invoice, Amount Due, Payment Status, Download
/// PDF." A customer wanting the full breakdown uses that Download PDF action.
/// </summary>
public sealed record HostedInvoiceDto(
    string BusinessName,
    string? LogoUrl,
    string InvoiceNumber,
    InvoiceStatus Status,
    DateOnly IssueDate,
    DateOnly DueDate,
    string Currency,
    decimal TotalAmount,
    decimal AmountDue);
