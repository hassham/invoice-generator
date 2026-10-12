using System.Security.Claims;
using InvoiceApp.Application.Businesses;

namespace InvoiceApp.Api.Endpoints;

/// <summary>IG-239 / IG-297 / IG-298: team invitations and membership. Team management is owner-only;
/// the invitee accepts while signed in with the invited email.</summary>
public static class BusinessInvitationEndpoints
{
    public static void MapBusinessInvitationEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/v1/businesses/{businessId:guid}/team", GetTeamAsync).RequireAuthorization();
        app.MapPost("/api/v1/businesses/{businessId:guid}/invitations", InviteAsync).RequireAuthorization();
        app.MapPost("/api/v1/businesses/{businessId:guid}/invitations/{id:guid}/cancel", CancelInvitationAsync).RequireAuthorization();
        app.MapDelete("/api/v1/businesses/{businessId:guid}/members/{id:guid}", RemoveMemberAsync).RequireAuthorization();

        app.MapGet("/api/v1/invitations/{token}", GetInvitationAsync).RequireAuthorization();
        app.MapPost("/api/v1/invitations/{token}/accept", AcceptInvitationAsync).RequireAuthorization();
    }

    private static async Task<IResult> GetTeamAsync(Guid businessId, ClaimsPrincipal user, IBusinessInvitationService invitations, CancellationToken cancellationToken)
    {
        var team = await invitations.GetTeamAsync(UserId(user), businessId, cancellationToken);
        return Results.Ok(team);
    }

    private static async Task<IResult> InviteAsync(Guid businessId, InviteBusinessMemberRequest request, ClaimsPrincipal user, IBusinessInvitationService invitations, CancellationToken cancellationToken)
    {
        var invitation = await invitations.InviteAsync(UserId(user), businessId, request, cancellationToken);
        return Results.Ok(invitation);
    }

    private static async Task<IResult> CancelInvitationAsync(Guid businessId, Guid id, ClaimsPrincipal user, IBusinessInvitationService invitations, CancellationToken cancellationToken)
    {
        await invitations.CancelInvitationAsync(UserId(user), businessId, id, cancellationToken);
        return Results.NoContent();
    }

    private static async Task<IResult> RemoveMemberAsync(Guid businessId, Guid id, ClaimsPrincipal user, IBusinessInvitationService invitations, CancellationToken cancellationToken)
    {
        await invitations.RemoveMemberAsync(UserId(user), businessId, id, cancellationToken);
        return Results.NoContent();
    }

    private static async Task<IResult> GetInvitationAsync(string token, ClaimsPrincipal user, IBusinessInvitationService invitations, CancellationToken cancellationToken)
    {
        var invitation = await invitations.GetInvitationAsync(UserId(user), token, cancellationToken);
        return Results.Ok(invitation);
    }

    private static async Task<IResult> AcceptInvitationAsync(string token, ClaimsPrincipal user, IBusinessInvitationService invitations, CancellationToken cancellationToken)
    {
        var invitation = await invitations.AcceptInvitationAsync(UserId(user), token, cancellationToken);
        return Results.Ok(invitation);
    }

    private static Guid UserId(ClaimsPrincipal user) => Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
