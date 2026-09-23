namespace InvoiceApp.Application.Reporting;

/// <summary>
/// IG-224: Revenue aggregated by period (month/quarter/year). Revenue is the sum of paid
/// amounts on invoices in the business's default currency. Periods with no paid invoices
/// show zero.
/// </summary>
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
/// </summary>
public sealed record RevenueByCustomerDto(
    Guid CustomerId,
    string CustomerName,
    string Currency,
    decimal Revenue);

/// <summary>
/// IG-227: Tax summary for a period - totals tax collected by currency.
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
