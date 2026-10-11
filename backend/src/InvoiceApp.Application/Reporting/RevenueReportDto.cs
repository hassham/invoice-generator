namespace InvoiceApp.Application.Reporting;

/// <summary>
/// IG-224: Revenue aggregated by period (month/quarter/year). Revenue is the sum of paid
/// amounts on invoices in the business's default currency. Periods with no payments received
/// show zero.
/// </summary>
/// <remarks>
/// IG-313: this report is <b>cash basis</b>. A payment belongs to the period it was received in,
/// and the requested date range is matched against the payment date, not the invoice's issue
/// date. An invoice issued in September and paid in October is October revenue. Unpaid and
/// part-paid invoices contribute only what has actually been received; what is still owed is
/// reported by <see cref="OutstandingInvoiceDto"/> instead, so the two never restate the same
/// money. Note the tax summary is accrual (see <see cref="TaxSummaryDto"/>) and deliberately
/// still keyed on issue date - the two reports answer different questions and will not tie out
/// over the same range.
/// </remarks>
public sealed record RevenuePeriodDto(
    string Period,
    decimal Revenue);

public sealed record RevenueReportDto(
    string Currency,
    string PeriodType,
    IReadOnlyList<RevenuePeriodDto> Periods);

/// <summary>
/// IG-225: Outstanding invoice (AmountDue > 0, not Cancelled).
/// </summary>
public sealed record OutstandingInvoiceDto(
    Guid Id,
    string InvoiceNumber,
    string CustomerName,
    DateOnly IssueDate,
    DateOnly DueDate,
    string Currency,
    decimal AmountDue,
    string Status);

/// <summary>
/// IG-225: Overdue invoice (outstanding and past due date).
/// </summary>
public sealed record OverdueInvoiceDto(
    Guid Id,
    string InvoiceNumber,
    string CustomerName,
    DateOnly IssueDate,
    DateOnly DueDate,
    string Currency,
    decimal AmountDue,
    string Status);

/// <summary>
/// IG-226: Revenue aggregated by customer. Includes all customers with zero revenue shown explicitly.
/// IG-313: cash basis, on the same terms as <see cref="RevenuePeriodDto"/> - revenue per customer
/// over a range sums to the revenue report over that same range.
/// </summary>
public sealed record RevenueByCustomerDto(
    Guid CustomerId,
    string CustomerName,
    string Currency,
    decimal Revenue);

/// <summary>
/// IG-227: Tax summary for a period - totals tax collected by currency.
/// IG-313: unlike the revenue report, this is <b>accrual</b> - it totals the tax on invoices
/// ISSUED in the range, whether or not they have been paid. That is internally consistent, but it
/// means the tax summary and the revenue report will not agree over the same range. Left as-is
/// deliberately: when tax becomes payable is a tax question, not a reporting preference.
/// </summary>
public sealed record TaxByRateDto(
    decimal TaxRate,
    decimal TaxableAmount,
    decimal TaxCollected);

public sealed record TaxSummaryDto(
    string Currency,
    decimal TotalTaxableAmount,
    decimal TotalTaxCollected,
    IReadOnlyList<TaxByRateDto> TaxesByRate);
