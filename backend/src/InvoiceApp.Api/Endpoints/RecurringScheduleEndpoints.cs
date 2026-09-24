using System.Security.Claims;
using InvoiceApp.Application.Invoicing;

namespace InvoiceApp.Api.Endpoints;

public static class RecurringScheduleEndpoints
{
    public static IEndpointRouteBuilder MapRecurringScheduleEndpoints(this IEndpointRouteBuilder app)
    {
        // IG-229: Create recurring schedule - authenticated, account-owned
        app.MapPost("/api/v1/businesses/{businessId:guid}/recurring-schedules", CreateAsync).RequireAuthorization();
        // IG-229: List recurring schedules for a business
        app.MapGet("/api/v1/businesses/{businessId:guid}/recurring-schedules", ListAsync).RequireAuthorization();
        // IG-229: Get a specific recurring schedule
        app.MapGet("/api/v1/businesses/{businessId:guid}/recurring-schedules/{id:guid}", GetAsync).RequireAuthorization();
        return app;
    }

    private static async Task<IResult> CreateAsync(
        ClaimsPrincipal user,
        Guid businessId,
        IRecurringScheduleService recurringService,
        CreateRecurringScheduleCommand command,
        CancellationToken cancellationToken)
    {
        var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);

        try
        {
            var schedule = await recurringService.CreateAsync(userId, businessId, command, cancellationToken);
            return Results.Created($"/api/v1/businesses/{businessId}/recurring-schedules/{schedule.Id}", schedule);
        }
        catch (ArgumentException ex)
        {
            return Results.BadRequest(new { detail = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Results.BadRequest(new { detail = ex.Message });
        }
    }

    private static async Task<IResult> ListAsync(
        ClaimsPrincipal user,
        Guid businessId,
        IRecurringScheduleService recurringService,
        CancellationToken cancellationToken)
    {
        var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);

        try
        {
            var schedules = await recurringService.ListByBusinessAsync(userId, businessId, cancellationToken);
            return Results.Ok(schedules);
        }
        catch (InvalidOperationException)
        {
            return Results.Unauthorized();
        }
    }

    private static async Task<IResult> GetAsync(
        ClaimsPrincipal user,
        Guid businessId,
        Guid id,
        IRecurringScheduleService recurringService,
        CancellationToken cancellationToken)
    {
        var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);

        try
        {
            var schedule = await recurringService.GetAsync(userId, businessId, id, cancellationToken);
            return Results.Ok(schedule);
        }
        catch (InvalidOperationException)
        {
            return Results.NotFound();
        }
    }
}
