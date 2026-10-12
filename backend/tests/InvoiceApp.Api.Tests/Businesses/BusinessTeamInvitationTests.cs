using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using InvoiceApp.Api.Tests.Authentication;
using InvoiceApp.Application.Businesses;
using InvoiceApp.Application.Identity;
using InvoiceApp.Infrastructure.Businesses;
using InvoiceApp.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace InvoiceApp.Api.Tests.Businesses;

/// <summary>IG-239 (Invite a team member), with IG-297 (invite by email, access to invited businesses only)
/// and IG-298 (cancel a pending invite before acceptance, revoke access after it).</summary>
public class BusinessTeamInvitationTests
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };

    private static async Task<HttpClient> RegisteredClientAsync(AuthenticatedRouteTestFactory factory, string email)
    {
        var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/v1/auth/register", new RegisterAccountRequest(email, "Password1", "Password1", null));
        response.EnsureSuccessStatusCode();
        return client;
    }

    private static async Task<Guid> CreateBusinessAsync(HttpClient client, string name)
    {
        var response = await client.PostAsJsonAsync("/api/v1/businesses", new CreateBusinessRequest(name, "AU", "AUD"));
        response.EnsureSuccessStatusCode();
        using var body = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync());
        return body.RootElement.GetProperty("id").GetGuid();
    }

    private static async Task<HttpResponseMessage> InviteAsync(HttpClient owner, Guid businessId, string email) =>
        await owner.PostAsJsonAsync($"/api/v1/businesses/{businessId}/invitations", new InviteBusinessMemberRequest(email));

    /// <summary>The raw token exists only in the invitation email, so tests read it from there.</summary>
    private static string TokenFromLatestEmail(AuthenticatedRouteTestFactory factory)
    {
        var body = factory.InvoiceEmailSender.SentMessages.Last().PlainTextBody;
        return Regex.Match(body, @"/invitations/([A-Za-z0-9_\-]+)").Groups[1].Value;
    }

    private static async Task<HttpResponseMessage> AcceptAsync(HttpClient invitee, string token) =>
        await invitee.PostAsync($"/api/v1/invitations/{token}/accept", null);

    private static async Task<TeamSnapshot> TeamAsync(HttpClient owner, Guid businessId)
    {
        var response = await owner.GetAsync($"/api/v1/businesses/{businessId}/team");
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<TeamSnapshot>(JsonOptions))!;
    }

    private sealed record TeamSnapshot(List<PendingInvite> PendingInvitations, List<Member> Members);
    private sealed record PendingInvite(Guid Id, string Email, DateTimeOffset CreatedAt, DateTimeOffset ExpiresAt);
    private sealed record Member(Guid Id, Guid UserId, string Email, DateTimeOffset JoinedAt);

    [Fact]
    public async Task Owner_invites_by_email_and_the_invite_is_listed_as_pending_with_no_token_exposed()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var owner = await RegisteredClientAsync(factory, "team-owner@example.com");
        var businessId = await DefaultBusinessRoutes.DefaultBusinessIdAsync(owner);

        var response = await InviteAsync(owner, businessId, "Invitee@Example.com");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var team = await TeamAsync(owner, businessId);
        var invite = Assert.Single(team.PendingInvitations);
        Assert.Equal("invitee@example.com", invite.Email);
        Assert.Contains("/invitations/", factory.InvoiceEmailSender.SentMessages.Last().HtmlBody);
        Assert.DoesNotContain("token", await response.Content.ReadAsStringAsync(), StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Only_a_hash_of_the_token_is_stored()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var owner = await RegisteredClientAsync(factory, "team-hash-owner@example.com");
        var businessId = await DefaultBusinessRoutes.DefaultBusinessIdAsync(owner);
        await InviteAsync(owner, businessId, "team-hash-invitee@example.com");
        var token = TokenFromLatestEmail(factory);

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var stored = await db.BusinessInvitations.SingleAsync();

        Assert.NotEqual(token, stored.TokenHash);
        Assert.DoesNotContain(token, stored.TokenHash);
        Assert.Equal(64, stored.TokenHash.Length);
    }

    [Fact]
    public async Task Invitee_who_accepts_gets_access_to_the_invited_business_and_nothing_else()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var owner = await RegisteredClientAsync(factory, "scope-owner@example.com");
        var invitedBusiness = await DefaultBusinessRoutes.DefaultBusinessIdAsync(owner);
        var otherBusiness = await CreateBusinessAsync(owner, "Owner's Other Business");

        await InviteAsync(owner, invitedBusiness, "scope-invitee@example.com");
        using var invitee = await RegisteredClientAsync(factory, "scope-invitee@example.com");
        var accept = await AcceptAsync(invitee, TokenFromLatestEmail(factory));

        Assert.Equal(HttpStatusCode.OK, accept.StatusCode);
        var list = await invitee.GetFromJsonAsync<List<BusinessProfileDto>>("/api/v1/businesses", JsonOptions);
        Assert.Contains(list!, business => business.Id == invitedBusiness);
        Assert.DoesNotContain(list!, business => business.Id == otherBusiness);

        Assert.Equal(HttpStatusCode.OK, (await invitee.GetAsync($"/api/v1/businesses/{invitedBusiness}/invoices")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await invitee.GetAsync($"/api/v1/businesses/{otherBusiness}/invoices")).StatusCode);
    }

    [Fact]
    public async Task Member_cannot_manage_the_team_or_invite_others()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var owner = await RegisteredClientAsync(factory, "member-manage-owner@example.com");
        var businessId = await DefaultBusinessRoutes.DefaultBusinessIdAsync(owner);
        await InviteAsync(owner, businessId, "member-manage-invitee@example.com");
        using var invitee = await RegisteredClientAsync(factory, "member-manage-invitee@example.com");
        await AcceptAsync(invitee, TokenFromLatestEmail(factory));

        var team = await invitee.GetAsync($"/api/v1/businesses/{businessId}/team");
        var invite = await InviteAsync(invitee, businessId, "someone-else@example.com");

        Assert.Equal(HttpStatusCode.Forbidden, team.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, invite.StatusCode);
    }

    [Fact]
    public async Task Accepting_with_a_different_signed_in_email_is_refused()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var owner = await RegisteredClientAsync(factory, "wrong-email-owner@example.com");
        var businessId = await DefaultBusinessRoutes.DefaultBusinessIdAsync(owner);
        await InviteAsync(owner, businessId, "wrong-email-invitee@example.com");
        var token = TokenFromLatestEmail(factory);

        using var stranger = await RegisteredClientAsync(factory, "wrong-email-stranger@example.com");
        var response = await AcceptAsync(stranger, token);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await stranger.GetAsync($"/api/v1/businesses/{businessId}/invoices")).StatusCode);
    }

    [Fact]
    public async Task A_cancelled_invitation_cannot_be_accepted()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var owner = await RegisteredClientAsync(factory, "cancel-owner@example.com");
        var businessId = await DefaultBusinessRoutes.DefaultBusinessIdAsync(owner);
        await InviteAsync(owner, businessId, "cancel-invitee@example.com");
        var token = TokenFromLatestEmail(factory);
        var inviteId = (await TeamAsync(owner, businessId)).PendingInvitations.Single().Id;

        var cancel = await owner.PostAsync($"/api/v1/businesses/{businessId}/invitations/{inviteId}/cancel", null);
        using var invitee = await RegisteredClientAsync(factory, "cancel-invitee@example.com");
        var accept = await AcceptAsync(invitee, token);

        Assert.Equal(HttpStatusCode.NoContent, cancel.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, accept.StatusCode);
        Assert.Empty((await TeamAsync(owner, businessId)).PendingInvitations);
    }

    [Fact]
    public async Task Cancelling_an_invitation_twice_is_refused_the_second_time()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var owner = await RegisteredClientAsync(factory, "cancel-twice-owner@example.com");
        var businessId = await DefaultBusinessRoutes.DefaultBusinessIdAsync(owner);
        await InviteAsync(owner, businessId, "cancel-twice-invitee@example.com");
        var inviteId = (await TeamAsync(owner, businessId)).PendingInvitations.Single().Id;
        await owner.PostAsync($"/api/v1/businesses/{businessId}/invitations/{inviteId}/cancel", null);

        var second = await owner.PostAsync($"/api/v1/businesses/{businessId}/invitations/{inviteId}/cancel", null);

        Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);
    }

    [Fact]
    public async Task Removing_a_member_revokes_access_and_reinviting_restores_it_without_duplicating_the_row()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var owner = await RegisteredClientAsync(factory, "revoke-owner@example.com");
        var businessId = await DefaultBusinessRoutes.DefaultBusinessIdAsync(owner);
        await InviteAsync(owner, businessId, "revoke-invitee@example.com");
        using var invitee = await RegisteredClientAsync(factory, "revoke-invitee@example.com");
        await AcceptAsync(invitee, TokenFromLatestEmail(factory));
        var memberId = (await TeamAsync(owner, businessId)).Members.Single(m => m.Email == "revoke-invitee@example.com").Id;

        var remove = await owner.DeleteAsync($"/api/v1/businesses/{businessId}/members/{memberId}");
        var afterRemoval = await invitee.GetAsync($"/api/v1/businesses/{businessId}/invoices");

        Assert.Equal(HttpStatusCode.NoContent, remove.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, afterRemoval.StatusCode);

        await InviteAsync(owner, businessId, "revoke-invitee@example.com");
        await AcceptAsync(invitee, TokenFromLatestEmail(factory));

        Assert.Equal(HttpStatusCode.OK, (await invitee.GetAsync($"/api/v1/businesses/{businessId}/invoices")).StatusCode);
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        Assert.Single(await db.BusinessMemberships.ToListAsync());
    }

    [Fact]
    public async Task An_expired_invitation_cannot_be_accepted()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var owner = await RegisteredClientAsync(factory, "expiry-owner@example.com");
        var businessId = await DefaultBusinessRoutes.DefaultBusinessIdAsync(owner);
        await InviteAsync(owner, businessId, "expiry-invitee@example.com");
        var token = TokenFromLatestEmail(factory);
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var invitation = await db.BusinessInvitations.SingleAsync();
            invitation.ExpiresAt = DateTimeOffset.UtcNow.AddMinutes(-1);
            await db.SaveChangesAsync();
        }

        using var invitee = await RegisteredClientAsync(factory, "expiry-invitee@example.com");
        var response = await AcceptAsync(invitee, token);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task Accepting_twice_by_the_same_person_is_harmless()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var owner = await RegisteredClientAsync(factory, "twice-owner@example.com");
        var businessId = await DefaultBusinessRoutes.DefaultBusinessIdAsync(owner);
        await InviteAsync(owner, businessId, "twice-invitee@example.com");
        var token = TokenFromLatestEmail(factory);
        using var invitee = await RegisteredClientAsync(factory, "twice-invitee@example.com");

        var first = await AcceptAsync(invitee, token);
        var second = await AcceptAsync(invitee, token);

        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        Assert.Equal(HttpStatusCode.OK, second.StatusCode);
    }

    [Fact]
    public async Task A_second_pending_invite_to_the_same_email_is_refused()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var owner = await RegisteredClientAsync(factory, "dup-owner@example.com");
        var businessId = await DefaultBusinessRoutes.DefaultBusinessIdAsync(owner);
        await InviteAsync(owner, businessId, "dup-invitee@example.com");

        var second = await InviteAsync(owner, businessId, "dup-invitee@example.com");

        Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);
    }

    [Fact]
    public async Task Inviting_the_owner_or_an_existing_member_is_refused()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var owner = await RegisteredClientAsync(factory, "self-owner@example.com");
        var businessId = await DefaultBusinessRoutes.DefaultBusinessIdAsync(owner);

        var self = await InviteAsync(owner, businessId, "self-owner@example.com");

        Assert.Equal(HttpStatusCode.Conflict, self.StatusCode);
    }

    [Fact]
    public async Task An_invalid_email_is_rejected()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var owner = await RegisteredClientAsync(factory, "bad-email-owner@example.com");
        var businessId = await DefaultBusinessRoutes.DefaultBusinessIdAsync(owner);

        var response = await InviteAsync(owner, businessId, "not-an-email");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Empty(factory.InvoiceEmailSender.SentMessages);
    }
}
