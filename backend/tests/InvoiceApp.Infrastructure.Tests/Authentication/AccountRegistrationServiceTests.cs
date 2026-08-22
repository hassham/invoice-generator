using InvoiceApp.Application.Exceptions;
using InvoiceApp.Application.Identity;
using Microsoft.EntityFrameworkCore;

namespace InvoiceApp.Infrastructure.Tests.Authentication;

public class AccountRegistrationServiceTests
{
    [Fact]
    public async Task Successful_registration_creates_one_user_and_one_default_business()
    {
        using var harness = new AuthenticationTestHarness();
        var request = new RegisterAccountRequest("new.user@example.com", "Password1", "Password1", "Jordan");

        var registered = await harness.AccountRegistrationService.RegisterAsync(request, CancellationToken.None);

        var user = await harness.DbContext.Users.SingleAsync(u => u.Id == registered.UserId);
        Assert.Equal("new.user@example.com", user.Email);

        var business = await harness.DbContext.Businesses.SingleAsync(b => b.Id == registered.BusinessId);
        Assert.Equal(registered.UserId, business.UserId);
        Assert.Equal("AU", business.Country);
        Assert.Equal("AUD", business.DefaultCurrency);
        Assert.Equal("Jordan's Business", business.BusinessName);
    }

    [Fact]
    public async Task Falls_back_to_a_generic_business_name_when_no_name_was_given()
    {
        using var harness = new AuthenticationTestHarness();
        var request = new RegisterAccountRequest("no.name@example.com", "Password1", "Password1", null);

        var registered = await harness.AccountRegistrationService.RegisterAsync(request, CancellationToken.None);

        var business = await harness.DbContext.Businesses.SingleAsync(b => b.Id == registered.BusinessId);
        Assert.Equal("My Business", business.BusinessName);
    }

    [Fact]
    public async Task Duplicate_email_is_rejected_and_leaves_no_partial_state()
    {
        using var harness = new AuthenticationTestHarness();
        var first = new RegisterAccountRequest("duplicate@example.com", "Password1", "Password1", "First");
        await harness.AccountRegistrationService.RegisterAsync(first, CancellationToken.None);

        var second = new RegisterAccountRequest("duplicate@example.com", "Password2", "Password2", "Second");

        await Assert.ThrowsAsync<ConflictException>(
            () => harness.AccountRegistrationService.RegisterAsync(second, CancellationToken.None));

        // Exactly one user and one business exist - the rejected attempt created nothing.
        Assert.Equal(1, await harness.DbContext.Users.CountAsync());
        Assert.Equal(1, await harness.DbContext.Businesses.CountAsync());
    }

    [Theory]
    [InlineData("short1A")] // 7 chars, below the FSD's 8-character minimum
    [InlineData("alllowercase1")] // no uppercase letter
    [InlineData("ALLUPPERCASE1")] // no lowercase letter
    [InlineData("NoDigitsHere")] // no digit
    public async Task Rejects_a_password_that_fails_the_FSD_rules(string password)
    {
        using var harness = new AuthenticationTestHarness();
        var request = new RegisterAccountRequest("weak.password@example.com", password, password, null);

        await Assert.ThrowsAsync<ValidationException>(
            () => harness.AccountRegistrationService.RegisterAsync(request, CancellationToken.None));

        Assert.Equal(0, await harness.DbContext.Users.CountAsync());
    }

    [Fact]
    public async Task Does_not_require_a_special_character_even_though_Identitys_own_default_does()
    {
        // FSD 7.1 only requires length + upper + lower + digit - no special character. Identity's
        // out-of-the-box default DOES require one, so this proves the explicit override actually
        // took effect rather than silently falling back to the stricter default.
        using var harness = new AuthenticationTestHarness();
        var request = new RegisterAccountRequest("plain.password@example.com", "Password1", "Password1", null);

        var registered = await harness.AccountRegistrationService.RegisterAsync(request, CancellationToken.None);

        Assert.NotEqual(Guid.Empty, registered.UserId);
    }
}
