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
    decimal AmountDue,
    // IG-216: Business.StripeAccountId's own doc comment ties a null value directly to hiding the
    // hosted invoice page's Pay Now button - this is the field that lets the anonymous frontend
    // know whether to show it, without exposing the account id itself.
    bool HasStripeAccount);
