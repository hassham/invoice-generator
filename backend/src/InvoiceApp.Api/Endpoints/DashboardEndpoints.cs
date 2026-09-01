using System.Security.Claims;
using InvoiceApp.Application.Dashboard;

namespace InvoiceApp.Api.Endpoints;

public static class DashboardEndpoints
{
    public static IEndpointRouteBuilder MapDashboardEndpoints(this IEndpointRouteBuilder app)
    {
        // FSD section 98. Account-owned aggregation, so requires a session like the other
        // invoice/customer read endpoints.
        app.MapGet("/api/v1/dashboard/summary", GetSummaryAsync).RequireAuthorization();
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
}
