namespace InvoiceApp.Application.Dashboard;

public interface IDashboardService
{
    /// <summary>
    /// `startDate`/`endDate` scope Total Invoiced/Total Paid only (FSD section 42's period
    /// selector - "financial activity during this period"); Outstanding/Overdue are current
    /// balances, not period activity, and are always computed across all account-owned invoices
    /// regardless of the period - both null default to the current calendar month (FSD's stated
    /// default).
    /// </summary>
    Task<DashboardSummaryDto> GetSummaryAsync(Guid userId, DateOnly? startDate, DateOnly? endDate, CancellationToken cancellationToken);
}
