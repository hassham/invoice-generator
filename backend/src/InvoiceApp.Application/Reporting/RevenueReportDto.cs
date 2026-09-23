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
