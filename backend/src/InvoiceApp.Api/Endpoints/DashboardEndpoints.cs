using System.Security.Claims;
using InvoiceApp.Application.Dashboard;
using InvoiceApp.Application.Reporting;

namespace InvoiceApp.Api.Endpoints;

public static class DashboardEndpoints
{
    public static IEndpointRouteBuilder MapDashboardEndpoints(this IEndpointRouteBuilder app)
    {
        // FSD section 98. Account-owned aggregation, so requires a session like the other
        // invoice/customer read endpoints.
        app.MapGet("/api/v1/dashboard/summary", GetSummaryAsync).RequireAuthorization();
        // IG-224: revenue report endpoint
        app.MapGet("/api/v1/reports/revenue", GetRevenueReportAsync).RequireAuthorization();
        // IG-225: outstanding and overdue invoice reports
        app.MapGet("/api/v1/reports/outstanding", GetOutstandingReportAsync).RequireAuthorization();
        app.MapGet("/api/v1/reports/overdue", GetOverdueReportAsync).RequireAuthorization();
        // IG-226: revenue by customer report
        app.MapGet("/api/v1/reports/by-customer", GetRevenueByCustomerAsync).RequireAuthorization();
        // IG-227: tax summary report
        app.MapGet("/api/v1/reports/tax-summary", GetTaxSummaryAsync).RequireAuthorization();
        // IG-228: CSV export endpoints
        app.MapGet("/api/v1/reports/revenue/export/csv", ExportRevenueReportCsvAsync).RequireAuthorization();
        app.MapGet("/api/v1/reports/outstanding/export/csv", ExportOutstandingInvoicesCsvAsync).RequireAuthorization();
        app.MapGet("/api/v1/reports/overdue/export/csv", ExportOverdueInvoicesCsvAsync).RequireAuthorization();
        app.MapGet("/api/v1/reports/by-customer/export/csv", ExportRevenueByCustomerCsvAsync).RequireAuthorization();
        app.MapGet("/api/v1/reports/tax-summary/export/csv", ExportTaxSummaryCsvAsync).RequireAuthorization();
        return app;
    }

    private static async Task<IResult> GetSummaryAsync(
        ClaimsPrincipal user,
        IDashboardService dashboardService,
        CancellationToken cancellationToken,
        DateOnly? startDate = null,
        DateOnly? endDate = null)
    {
        var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var summary = await dashboardService.GetSummaryAsync(userId, startDate, endDate, cancellationToken);
        return Results.Ok(summary);
    }

    private static async Task<IResult> GetRevenueReportAsync(
        ClaimsPrincipal user,
        IReportingService reportingService,
        CancellationToken cancellationToken,
        string periodType = "month",
        DateOnly? startDate = null,
        DateOnly? endDate = null)
    {
        if (!IsValidPeriodType(periodType))
        {
            return Results.BadRequest(new { detail = "periodType must be 'month', 'quarter', or 'year'." });
        }

        var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var report = await reportingService.GetRevenueReportAsync(userId, periodType, startDate, endDate, cancellationToken);
        return Results.Ok(report);
    }

    private static bool IsValidPeriodType(string periodType)
    {
        return periodType.ToLower() switch
        {
            "month" or "quarter" or "year" => true,
            _ => false,
        };
    }

    private static async Task<IResult> GetOutstandingReportAsync(
        ClaimsPrincipal user,
        IReportingService reportingService,
        CancellationToken cancellationToken)
    {
        var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var report = await reportingService.GetOutstandingReportAsync(userId, cancellationToken);
        return Results.Ok(report);
    }

    private static async Task<IResult> GetOverdueReportAsync(
        ClaimsPrincipal user,
        IReportingService reportingService,
        CancellationToken cancellationToken)
    {
        var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var report = await reportingService.GetOverdueReportAsync(userId, cancellationToken);
        return Results.Ok(report);
    }

    private static async Task<IResult> GetRevenueByCustomerAsync(
        ClaimsPrincipal user,
        IReportingService reportingService,
        CancellationToken cancellationToken,
        DateOnly? startDate = null,
        DateOnly? endDate = null)
    {
        var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var report = await reportingService.GetRevenueByCustomerAsync(userId, startDate, endDate, cancellationToken);
        return Results.Ok(report);
    }

    private static async Task<IResult> GetTaxSummaryAsync(
        ClaimsPrincipal user,
        IReportingService reportingService,
        CancellationToken cancellationToken,
        DateOnly? startDate = null,
        DateOnly? endDate = null)
    {
        var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var report = await reportingService.GetTaxSummaryAsync(userId, startDate, endDate, cancellationToken);
        return Results.Ok(report);
    }

    private static async Task<IResult> ExportRevenueReportCsvAsync(
        ClaimsPrincipal user,
        IReportingService reportingService,
        IExportService exportService,
        CancellationToken cancellationToken,
        string periodType = "month",
        DateOnly? startDate = null,
        DateOnly? endDate = null)
    {
        if (!IsValidPeriodType(periodType))
        {
            return Results.BadRequest(new { detail = "periodType must be 'month', 'quarter', or 'year'." });
        }

        var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var report = await reportingService.GetRevenueReportAsync(userId, periodType, startDate, endDate, cancellationToken);
        var csv = await exportService.ExportRevenueReportToCsvAsync(report);

        return Results.File(
            System.Text.Encoding.UTF8.GetBytes(csv),
            "text/csv",
            $"revenue-report-{periodType}.csv");
    }

    private static async Task<IResult> ExportOutstandingInvoicesCsvAsync(
        ClaimsPrincipal user,
        IReportingService reportingService,
        IExportService exportService,
        CancellationToken cancellationToken)
    {
        var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var invoices = await reportingService.GetOutstandingReportAsync(userId, cancellationToken);
        var csv = await exportService.ExportOutstandingInvoicesToCsvAsync(invoices);

        return Results.File(
            System.Text.Encoding.UTF8.GetBytes(csv),
            "text/csv",
            "outstanding-invoices.csv");
    }

    private static async Task<IResult> ExportOverdueInvoicesCsvAsync(
        ClaimsPrincipal user,
        IReportingService reportingService,
        IExportService exportService,
        CancellationToken cancellationToken)
    {
        var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var invoices = await reportingService.GetOverdueReportAsync(userId, cancellationToken);
        var csv = await exportService.ExportOverdueInvoicesToCsvAsync(invoices);

        return Results.File(
            System.Text.Encoding.UTF8.GetBytes(csv),
            "text/csv",
            "overdue-invoices.csv");
    }

    private static async Task<IResult> ExportRevenueByCustomerCsvAsync(
        ClaimsPrincipal user,
        IReportingService reportingService,
        IExportService exportService,
        CancellationToken cancellationToken,
        DateOnly? startDate = null,
        DateOnly? endDate = null)
    {
        var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var customers = await reportingService.GetRevenueByCustomerAsync(userId, startDate, endDate, cancellationToken);
        var csv = await exportService.ExportRevenueByCustomerToCsvAsync(customers);

        return Results.File(
            System.Text.Encoding.UTF8.GetBytes(csv),
            "text/csv",
            "revenue-by-customer.csv");
    }

    private static async Task<IResult> ExportTaxSummaryCsvAsync(
        ClaimsPrincipal user,
        IReportingService reportingService,
        IExportService exportService,
        CancellationToken cancellationToken,
        DateOnly? startDate = null,
        DateOnly? endDate = null)
    {
        var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var summary = await reportingService.GetTaxSummaryAsync(userId, startDate, endDate, cancellationToken);
        var csv = await exportService.ExportTaxSummaryToCsvAsync(summary);

        return Results.File(
            System.Text.Encoding.UTF8.GetBytes(csv),
            "text/csv",
            "tax-summary.csv");
    }
}
