namespace InvoiceApp.Application.Reporting;

/// <summary>
/// IG-242: one business's revenue inside a combined report. Each business keeps its own currency, so its
/// figures are attributed to it rather than merged into a single number.
/// </summary>
public sealed record CombinedBusinessRevenueDto(
    Guid BusinessId,
    string BusinessName,
    string Currency,
    IReadOnlyList<RevenuePeriodDto> Periods,
    decimal Total);

/// <summary>IG-242: totals are summed per currency only. Amounts in different currencies are never added
/// together, because there is no exchange-rate source to convert them with.</summary>
public sealed record CurrencyRevenueTotalDto(string Currency, decimal Total);

public sealed record CombinedRevenueReportDto(
    string PeriodType,
    IReadOnlyList<CombinedBusinessRevenueDto> Businesses,
    IReadOnlyList<CurrencyRevenueTotalDto> TotalsByCurrency);
