using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using InvoiceApp.Api.Tests.Authentication;
using InvoiceApp.Application.Businesses;
using InvoiceApp.Application.Identity;
using InvoiceApp.Domain.Businesses;
using InvoiceApp.Domain.Invoicing;

namespace InvoiceApp.Api.Tests.Businesses;

/// <summary>IG-240 (Control what a team member can do): a Restricted member cannot change payment settings
/// (Stripe connection, bank details) and cannot manage the team; an Admin can change payment settings.
/// Every check is made by the API, so these tests call endpoints directly rather than going through the UI.</summary>
public class BusinessRolesTests
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };

    private static async Task<HttpClient> RegisteredClientAsync(AuthenticatedRouteTestFactory factory, string email)
    {
        var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/v1/auth/register", new RegisterAccountRequest(email, "Password1", "Password1", null));
        response.EnsureSuccessStatusCode();
        return client;
    }

    private static BusinessProfileRequest ProfileRequest(string businessName, string? bankName = null) => new(
        BusinessName: businessName,
        LegalName: null,
        Email: null,
        Phone: null,
        Website: null,
        AddressLine1: null,
        AddressLine2: null,
        City: null,
        State: null,
        PostalCode: null,
        Country: "AU",
        RegistrationNumber: null,
        TaxNumber: null,
        DefaultCurrency: "AUD",
        DefaultTaxRate: 10,
        TaxCalculationMethod: TaxCalculationMethod.Exclusive,
        DefaultPaymentTerms: PaymentTermsOption.Net30,
        DefaultPaymentTermsDays: null,
        DefaultInvoiceNotes: null,
        DefaultTermsAndConditions: null,
        DefaultTemplateId: null,
        InvoicePrefix: "INV-",
        NextInvoiceNumber: 1,
        InvoiceNumberPadding: 4,
        BankName: bankName);

    private static async Task<HttpResponseMessage> UpdateProfileAsync(HttpClient client, Guid businessId, BusinessProfileRequest request) =>
        await client.PutAsJsonAsync($"/api/v1/businesses/{businessId}", request);

    /// <summary>Owner invites an email with the given role; the invitee accepts while signed in with it.</summary>
    private static async Task<HttpClient> MemberAsync(AuthenticatedRouteTestFactory factory, HttpClient owner, Guid businessId, string email, BusinessRole? role = null)
    {
        var invite = role is null
            ? new InviteBusinessMemberRequest(email)
            : new InviteBusinessMemberRequest(email, role.Value);
        var invited = await owner.PostAsJsonAsync($"/api/v1/businesses/{businessId}/invitations", invite);
        invited.EnsureSuccessStatusCode();

        var body = factory.InvoiceEmailSender.SentMessages.Last().PlainTextBody;
        var token = Regex.Match(body, @"/invitations/([A-Za-z0-9_\-]+)").Groups[1].Value;

        var member = await RegisteredClientAsync(factory, email);
        var accepted = await member.PostAsync($"/api/v1/invitations/{token}/accept", null);
        accepted.EnsureSuccessStatusCode();
        return member;
    }

    private static async Task<Guid> MemberIdAsync(HttpClient owner, Guid businessId, string email)
    {
        var team = await owner.GetFromJsonAsync<TeamView>($"/api/v1/businesses/{businessId}/team", JsonOptions);
        return team!.Members.Single(m => m.Email == email).Id;
    }

    private sealed record TeamView(List<InviteView> PendingInvitations, List<MemberView> Members);
    private sealed record InviteView(Guid Id, string Email, BusinessRole Role);
    private sealed record MemberView(Guid Id, Guid UserId, string Email, BusinessRole Role);

    [Fact]
    public async Task An_invited_member_is_restricted_unless_the_owner_chooses_otherwise()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var owner = await RegisteredClientAsync(factory, "roles-default-owner@example.com");
        var businessId = await DefaultBusinessRoutes.DefaultBusinessIdAsync(owner);

        await MemberAsync(factory, owner, businessId, "roles-default-restricted@example.com");
        await MemberAsync(factory, owner, businessId, "roles-default-admin@example.com", BusinessRole.Admin);

        var team = await owner.GetFromJsonAsync<TeamView>($"/api/v1/businesses/{businessId}/team", JsonOptions);
        Assert.Equal(BusinessRole.Restricted, team!.Members.Single(m => m.Email == "roles-default-restricted@example.com").Role);
        Assert.Equal(BusinessRole.Admin, team.Members.Single(m => m.Email == "roles-default-admin@example.com").Role);
    }

    [Fact]
    public async Task A_restricted_member_can_still_edit_the_business_name()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var owner = await RegisteredClientAsync(factory, "roles-name-owner@example.com");
        var businessId = await DefaultBusinessRoutes.DefaultBusinessIdAsync(owner);
        using var member = await MemberAsync(factory, owner, businessId, "roles-name-member@example.com");

        var response = await UpdateProfileAsync(member, businessId, ProfileRequest("Renamed By Member"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task A_restricted_member_cannot_change_bank_details_and_they_stay_unchanged()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var owner = await RegisteredClientAsync(factory, "roles-bank-owner@example.com");
        var businessId = await DefaultBusinessRoutes.DefaultBusinessIdAsync(owner);
        using var member = await MemberAsync(factory, owner, businessId, "roles-bank-member@example.com");

        var response = await UpdateProfileAsync(member, businessId, ProfileRequest("Acme", bankName: "Hijacked Bank"));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        var profile = await owner.GetFromJsonAsync<BusinessProfileDto>($"/api/v1/businesses/{businessId}", JsonOptions);
        Assert.Null(profile!.BankName);
    }

    [Fact]
    public async Task A_restricted_member_re_saving_unchanged_bank_details_is_allowed()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var owner = await RegisteredClientAsync(factory, "roles-resave-owner@example.com");
        var businessId = await DefaultBusinessRoutes.DefaultBusinessIdAsync(owner);
        await UpdateProfileAsync(owner, businessId, ProfileRequest("Acme", bankName: "Owner Bank"));
        using var member = await MemberAsync(factory, owner, businessId, "roles-resave-member@example.com");

        var response = await UpdateProfileAsync(member, businessId, ProfileRequest("Acme Renamed", bankName: "Owner Bank"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task A_restricted_member_cannot_connect_stripe()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var owner = await RegisteredClientAsync(factory, "roles-stripe-connect-owner@example.com");
        var businessId = await DefaultBusinessRoutes.DefaultBusinessIdAsync(owner);
        using var member = await MemberAsync(factory, owner, businessId, "roles-stripe-connect-member@example.com");

        var response = await member.GetAsync($"/api/v1/businesses/{businessId}/stripe/connect");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.False(response.Headers.Contains("Set-Cookie"));
    }

    [Fact]
    public async Task A_restricted_member_cannot_disconnect_stripe()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var owner = await RegisteredClientAsync(factory, "roles-stripe-disconnect-owner@example.com");
        var businessId = await DefaultBusinessRoutes.DefaultBusinessIdAsync(owner);
        using var member = await MemberAsync(factory, owner, businessId, "roles-stripe-disconnect-member@example.com");

        var response = await member.PostAsync($"/api/v1/businesses/{businessId}/stripe/disconnect", null);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task An_admin_member_can_change_bank_details()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var owner = await RegisteredClientAsync(factory, "roles-admin-bank-owner@example.com");
        var businessId = await DefaultBusinessRoutes.DefaultBusinessIdAsync(owner);
        using var admin = await MemberAsync(factory, owner, businessId, "roles-admin-bank-member@example.com", BusinessRole.Admin);

        var response = await UpdateProfileAsync(admin, businessId, ProfileRequest("Acme", bankName: "Admin Bank"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var profile = await owner.GetFromJsonAsync<BusinessProfileDto>($"/api/v1/businesses/{businessId}", JsonOptions);
        Assert.Equal("Admin Bank", profile!.BankName);
    }

    [Fact]
    public async Task An_admin_member_passes_the_payment_gate_and_a_restricted_member_does_not()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var owner = await RegisteredClientAsync(factory, "roles-admin-stripe-owner@example.com");
        var businessId = await DefaultBusinessRoutes.DefaultBusinessIdAsync(owner);
        using var admin = await MemberAsync(factory, owner, businessId, "roles-admin-stripe-admin@example.com", BusinessRole.Admin);
        using var restricted = await MemberAsync(factory, owner, businessId, "roles-admin-stripe-restricted@example.com");

        // No Stripe account is connected, so disconnect is a no-op for an admin and needs no Stripe call.
        var adminResponse = await admin.PostAsync($"/api/v1/businesses/{businessId}/stripe/disconnect", null);
        var restrictedResponse = await restricted.PostAsync($"/api/v1/businesses/{businessId}/stripe/disconnect", null);

        Assert.Equal(HttpStatusCode.OK, adminResponse.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, restrictedResponse.StatusCode);
    }

    [Fact]
    public async Task The_owner_can_promote_and_demote_a_member_and_the_change_takes_effect_immediately()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var owner = await RegisteredClientAsync(factory, "roles-change-owner@example.com");
        var businessId = await DefaultBusinessRoutes.DefaultBusinessIdAsync(owner);
        using var member = await MemberAsync(factory, owner, businessId, "roles-change-member@example.com");
        var memberId = await MemberIdAsync(owner, businessId, "roles-change-member@example.com");

        var promote = await owner.PutAsJsonAsync($"/api/v1/businesses/{businessId}/members/{memberId}/role", new ChangeMemberRoleRequest(BusinessRole.Admin));
        var asAdmin = await UpdateProfileAsync(member, businessId, ProfileRequest("Acme", bankName: "Now Admin"));

        var demote = await owner.PutAsJsonAsync($"/api/v1/businesses/{businessId}/members/{memberId}/role", new ChangeMemberRoleRequest(BusinessRole.Restricted));
        var asRestricted = await UpdateProfileAsync(member, businessId, ProfileRequest("Acme", bankName: "Demoted Again"));

        Assert.Equal(HttpStatusCode.NoContent, promote.StatusCode);
        Assert.Equal(HttpStatusCode.OK, asAdmin.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, demote.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, asRestricted.StatusCode);
    }

    [Fact]
    public async Task A_member_cannot_change_roles()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var owner = await RegisteredClientAsync(factory, "roles-no-self-owner@example.com");
        var businessId = await DefaultBusinessRoutes.DefaultBusinessIdAsync(owner);
        using var member = await MemberAsync(factory, owner, businessId, "roles-no-self-member@example.com");
        using var other = await MemberAsync(factory, owner, businessId, "roles-no-self-other@example.com");
        var otherId = await MemberIdAsync(owner, businessId, "roles-no-self-other@example.com");

        var response = await member.PutAsJsonAsync($"/api/v1/businesses/{businessId}/members/{otherId}/role", new ChangeMemberRoleRequest(BusinessRole.Admin));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Changing_the_role_of_a_removed_member_is_not_found()
    {
        using var factory = new AuthenticatedRouteTestFactory();
        using var owner = await RegisteredClientAsync(factory, "roles-removed-owner@example.com");
        var businessId = await DefaultBusinessRoutes.DefaultBusinessIdAsync(owner);
        using var member = await MemberAsync(factory, owner, businessId, "roles-removed-member@example.com");
        var memberId = await MemberIdAsync(owner, businessId, "roles-removed-member@example.com");
        await owner.DeleteAsync($"/api/v1/businesses/{businessId}/members/{memberId}");

        var response = await owner.PutAsJsonAsync($"/api/v1/businesses/{businessId}/members/{memberId}/role", new ChangeMemberRoleRequest(BusinessRole.Admin));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
