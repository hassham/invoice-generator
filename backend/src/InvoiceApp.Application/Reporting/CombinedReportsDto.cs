namespace InvoiceApp.Application.Reporting;

/// <summary>IG-242: one business's invoices inside a combined list report, attributed to that business.</summary>
public sealed record CombinedBusinessInvoicesDto<T>(
    Guid BusinessId,
    string BusinessName,
    IReadOnlyList<T> Invoices);

/// <summary>IG-242: an amount summed in one currency. Combined totals are never summed across currencies.</summary>
public sealed record CurrencyAmountDto(string Currency, decimal Amount);

/// <summary>
/// IG-242: a combined outstanding or overdue report. Each invoice keeps its own currency, and the total is
/// summed per invoice currency.
/// </summary>
public sealed record CombinedInvoiceListReportDto<T>(
    IReadOnlyList<CombinedBusinessInvoicesDto<T>> Businesses,
    IReadOnlyList<CurrencyAmountDto> AmountDueByCurrency);

/// <summary>IG-242: one business's tax summary, in that business's currency.</summary>
public sealed record CombinedBusinessTaxDto(
    Guid BusinessId,
    string BusinessName,
    TaxSummaryDto Summary);

/// <summary>IG-242: a combined tax summary. Tax collected is totalled per currency only.</summary>
public sealed record CombinedTaxSummaryDto(
    IReadOnlyList<CombinedBusinessTaxDto> Businesses,
    IReadOnlyList<CurrencyAmountDto> TaxCollectedByCurrency);
