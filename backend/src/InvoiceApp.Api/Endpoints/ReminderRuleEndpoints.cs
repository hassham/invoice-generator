using System.Security.Claims;
using InvoiceApp.Application.Invoicing;

namespace InvoiceApp.Api.Endpoints;

public static class ReminderRuleEndpoints
{
    public static IEndpointRouteBuilder MapReminderRuleEndpoints(this IEndpointRouteBuilder app)
    {
        // IG-232: List reminder rules for a business
        app.MapGet("/api/v1/businesses/{businessId:guid}/reminder-rules", ListAsync).RequireAuthorization();
        // IG-232: Get a specific reminder rule
        app.MapGet("/api/v1/businesses/{businessId:guid}/reminder-rules/{id:guid}", GetAsync).RequireAuthorization();
        // IG-232: Update a reminder rule
        app.MapPut("/api/v1/businesses/{businessId:guid}/reminder-rules/{id:guid}", UpdateAsync).RequireAuthorization();
        // IG-232: Initialize default reminder rules
        app.MapPost("/api/v1/businesses/{businessId:guid}/reminder-rules/initialize-defaults", InitializeDefaultsAsync).RequireAuthorization();
        return app;
    }

    private static async Task<IResult> ListAsync(
        ClaimsPrincipal user,
        Guid businessId,
        IReminderRuleService reminderService,
        CancellationToken cancellationToken)
    {
        var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);

        try
        {
            var rules = await reminderService.ListByBusinessAsync(userId, businessId, cancellationToken);
            return Results.Ok(rules);
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
        IReminderRuleService reminderService,
        CancellationToken cancellationToken)
    {
        var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);

        try
        {
            var rule = await reminderService.GetAsync(userId, businessId, id, cancellationToken);
            return Results.Ok(rule);
        }
        catch (InvalidOperationException)
        {
            return Results.NotFound();
        }
    }

    private static async Task<IResult> UpdateAsync(
        ClaimsPrincipal user,
        Guid businessId,
        Guid id,
        IReminderRuleService reminderService,
        UpdateReminderRuleCommand command,
        CancellationToken cancellationToken)
    {
        var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);

        try
        {
            var rule = await reminderService.UpdateAsync(userId, businessId, id, command, cancellationToken);
            return Results.Ok(rule);
        }
        catch (InvalidOperationException)
        {
            return Results.NotFound();
        }
    }

    private static async Task<IResult> InitializeDefaultsAsync(
        ClaimsPrincipal user,
        Guid businessId,
        IReminderRuleService reminderService,
        CancellationToken cancellationToken)
    {
        var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);

        try
        {
            // Verify business ownership
            await reminderService.GetAsync(userId, businessId, Guid.NewGuid(), cancellationToken);
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("not found"))
        {
            return Results.Unauthorized();
        }

        try
        {
            var rules = await reminderService.InitializeDefaultRulesAsync(businessId, cancellationToken);
            return Results.Created($"/api/v1/businesses/{businessId}/reminder-rules", rules);
        }
        catch (InvalidOperationException)
        {
            return Results.BadRequest(new { detail = "Could not initialize default rules" });
        }
    }
}
