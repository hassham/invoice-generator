using System.Security.Claims;
using InvoiceApp.Application.Invoicing;

namespace InvoiceApp.Api.Endpoints;

/// <summary>
/// IG-311: makes a failing recurring schedule visible. Same route shape and same three operations
/// as <see cref="ReminderFailureEndpoints"/>, because it is the same idea.
/// </summary>
public static class RecurringGenerationFailureEndpoints
{
    public static IEndpointRouteBuilder MapRecurringGenerationFailureEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/v1/businesses/{businessId:guid}/recurring-generation-failures", ListAsync).RequireAuthorization();
        app.MapGet("/api/v1/businesses/{businessId:guid}/recurring-generation-failures/{id:guid}", GetAsync).RequireAuthorization();
        app.MapPost("/api/v1/businesses/{businessId:guid}/recurring-generation-failures/{id:guid}/resolve", ResolveAsync).RequireAuthorization();
        return app;
    }

    private static async Task<IResult> ListAsync(
        ClaimsPrincipal user,
        Guid businessId,
        IRecurringGenerationFailureService failureService,
        CancellationToken cancellationToken)
    {
        try
        {
            var failures = await failureService.ListUnresolvedByBusinessAsync(UserId(user), businessId, cancellationToken);
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
        IRecurringGenerationFailureService failureService,
        CancellationToken cancellationToken)
    {
        try
        {
            var failure = await failureService.GetAsync(UserId(user), businessId, id, cancellationToken);
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
        IRecurringGenerationFailureService failureService,
        CancellationToken cancellationToken)
    {
        try
        {
            await failureService.ResolveAsync(UserId(user), businessId, id, cancellationToken);
            return Results.NoContent();
        }
        catch (InvalidOperationException)
        {
            return Results.NotFound();
        }
    }

    private static Guid UserId(ClaimsPrincipal user) => Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
