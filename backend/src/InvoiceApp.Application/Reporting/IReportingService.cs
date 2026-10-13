namespace InvoiceApp.Application.Reporting;

/// <summary>
/// IG-224/IG-225: Reporting services scoped to the user's current business.
/// </summary>
public interface IReportingService
{
    /// <summary>
    /// IG-224: Get revenue aggregated by period (month, quarter, or year).
    /// Returns all periods from the start date to the end date, including those with zero revenue.
    /// Defaults to the current month if startDate/endDate are null.
    /// IG-313: cash basis - both the range filter and the period a payment lands in are taken from
    /// the payment date, not the invoice's issue date.
    /// </summary>
    Task<RevenueReportDto> GetRevenueReportAsync(
        Guid userId,
        Guid businessId,
        string periodType,
        DateOnly? startDate,
        DateOnly? endDate,
        CancellationToken cancellationToken);

    /// <summary>
    /// IG-242: the revenue report for every business the user can access, each attributed to its business,
    /// with totals per currency. The per-business figures are the same ones GetRevenueReportAsync returns.
    /// </summary>
    Task<CombinedRevenueReportDto> GetCombinedRevenueReportAsync(
        Guid userId,
        string periodType,
        DateOnly? startDate,
        DateOnly? endDate,
        CancellationToken cancellationToken);

    /// <summary>
    /// IG-225: Get invoices with outstanding balance (AmountDue > 0, not Cancelled).
    /// </summary>
    Task<List<OutstandingInvoiceDto>> GetOutstandingReportAsync(
        Guid userId,
        Guid businessId,
        CancellationToken cancellationToken);

    /// <summary>
    /// IG-225: Get invoices that are both outstanding and overdue (past due date).
    /// </summary>
    Task<List<OverdueInvoiceDto>> GetOverdueReportAsync(
        Guid userId,
        Guid businessId,
        CancellationToken cancellationToken);

    /// <summary>
    /// IG-226: Get revenue aggregated by customer over a period.
    /// Includes all customers, with zero revenue shown explicitly.
    /// IG-313: cash basis, matching GetRevenueReportAsync over the same range.
    /// </summary>
    Task<List<RevenueByCustomerDto>> GetRevenueByCustomerAsync(
        Guid userId,
        Guid businessId,
        DateOnly? startDate,
        DateOnly? endDate,
        CancellationToken cancellationToken);

    /// <summary>
    /// IG-227: Get tax summary for a period - totals tax collected across invoices.
    /// Uses each invoice's stored tax breakdown, not re-derived.
    /// Defaults to current month if startDate/endDate are null.
    /// </summary>
    Task<TaxSummaryDto> GetTaxSummaryAsync(
        Guid userId,
        Guid businessId,
        DateOnly? startDate,
        DateOnly? endDate,
        CancellationToken cancellationToken);

    /// <summary>IG-242: outstanding invoices across every business the caller can access, attributed per business.</summary>
    Task<CombinedInvoiceListReportDto<OutstandingInvoiceDto>> GetCombinedOutstandingReportAsync(Guid userId, CancellationToken cancellationToken);

    /// <summary>IG-242: overdue invoices across every business the caller can access, attributed per business.</summary>
    Task<CombinedInvoiceListReportDto<OverdueInvoiceDto>> GetCombinedOverdueReportAsync(Guid userId, CancellationToken cancellationToken);

    /// <summary>IG-242: tax summaries across every business the caller can access, attributed per business and totalled per currency.</summary>
    Task<CombinedTaxSummaryDto> GetCombinedTaxSummaryAsync(Guid userId, DateOnly? startDate, DateOnly? endDate, CancellationToken cancellationToken);
}
