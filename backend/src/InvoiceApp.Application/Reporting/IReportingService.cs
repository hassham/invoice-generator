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
    /// </summary>
    Task<RevenueReportDto> GetRevenueReportAsync(
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
        CancellationToken cancellationToken);

    /// <summary>
    /// IG-225: Get invoices that are both outstanding and overdue (past due date).
    /// </summary>
    Task<List<OverdueInvoiceDto>> GetOverdueReportAsync(
        Guid userId,
        CancellationToken cancellationToken);
}
