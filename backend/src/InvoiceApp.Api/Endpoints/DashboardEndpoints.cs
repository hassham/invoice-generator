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
        var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var report = await reportingService.GetRevenueReportAsync(userId, periodType, startDate, endDate, cancellationToken);
        return Results.Ok(report);
    }
}
