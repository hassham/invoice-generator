namespace InvoiceApp.Application.Reporting;

/// <summary>
/// IG-224: Revenue reporting. Reports are scoped to the user's current business and
/// computed from paid invoice amounts in the business's default currency.
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
}
