using InvoiceApp.Application.Invoicing;

namespace InvoiceApp.Application.Dashboard;

/// <summary>
/// FSD section 42/109. `Currency` is the business's current default currency (`business.
/// businesses.default_currency`) - the four totals only sum invoices in that currency. FSD never
/// addresses multi-currency aggregation (an account can create invoices in any of
/// CURRENCY_OPTIONS), and naively adding amounts across currencies would produce a meaningless
/// number, so invoices in any other currency are excluded from the totals rather than summed
/// incorrectly - a real fix would need per-currency breakdown or FX conversion, out of scope here.
/// RecentInvoices is unscoped by currency (each row already shows its own).
/// </summary>
public sealed record DashboardSummaryDto(
    decimal TotalInvoiced,
    decimal TotalPaid,
    decimal Outstanding,
    decimal Overdue,
    string Currency,
    IReadOnlyList<InvoiceListItemDto> RecentInvoices);
