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

/// <summary>
/// IG-242: one business's revenue-by-customer list. Customers are not merged across businesses: two customers
/// with the same name in different businesses are different records, so each stays under its own business.
/// </summary>
public sealed record CombinedBusinessCustomersDto(
    Guid BusinessId,
    string BusinessName,
    IReadOnlyList<RevenueByCustomerDto> Customers);

/// <summary>IG-242: revenue by customer across businesses, grouped by business. Totals are per currency.</summary>
public sealed record CombinedCustomerRevenueDto(
    IReadOnlyList<CombinedBusinessCustomersDto> Businesses,
    IReadOnlyList<CurrencyAmountDto> RevenueByCurrency);

/// <summary>IG-242: one business's tax summary, in that business's currency.</summary>
public sealed record CombinedBusinessTaxDto(
    Guid BusinessId,
    string BusinessName,
    TaxSummaryDto Summary);

/// <summary>IG-242: a combined tax summary. Tax collected is totalled per currency only.</summary>
public sealed record CombinedTaxSummaryDto(
    IReadOnlyList<CombinedBusinessTaxDto> Businesses,
    IReadOnlyList<CurrencyAmountDto> TaxCollectedByCurrency);
