using System.Security.Claims;
using InvoiceApp.Application.Invoicing;

namespace InvoiceApp.Api.Endpoints;

public static class ReminderFailureEndpoints
{
    public static IEndpointRouteBuilder MapReminderFailureEndpoints(this IEndpointRouteBuilder app)
    {
        // IG-233: List unresolved reminder failures for a business
        app.MapGet("/api/v1/businesses/{businessId:guid}/reminder-failures", ListAsync).RequireAuthorization();
        // IG-233: Get a specific reminder failure
        app.MapGet("/api/v1/businesses/{businessId:guid}/reminder-failures/{id:guid}", GetAsync).RequireAuthorization();
        // IG-233: Mark a reminder failure as resolved
        app.MapPatch("/api/v1/businesses/{businessId:guid}/reminder-failures/{id:guid}/resolve", ResolveAsync).RequireAuthorization();
        return app;
    }

    private static async Task<IResult> ListAsync(
        ClaimsPrincipal user,
        Guid businessId,
        IReminderFailureService failureService,
        CancellationToken cancellationToken)
    {
        var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);

        try
        {
            var failures = await failureService.ListUnresolvedByBusinessAsync(userId, businessId, cancellationToken);
            return Results.Ok(failures);
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
        IReminderFailureService failureService,
        CancellationToken cancellationToken)
    {
        var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);

        try
        {
            var failure = await failureService.GetAsync(userId, businessId, id, cancellationToken);
            return Results.Ok(failure);
        }
        catch (InvalidOperationException)
        {
            return Results.NotFound();
        }
    }

    private static async Task<IResult> ResolveAsync(
        ClaimsPrincipal user,
        Guid businessId,
        Guid id,
        IReminderFailureService failureService,
        CancellationToken cancellationToken)
    {
        var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);

        try
        {
            await failureService.ResolveAsync(userId, businessId, id, cancellationToken);
            return Results.NoContent();
        }
        catch (InvalidOperationException)
        {
            return Results.NotFound();
        }
    }
}
