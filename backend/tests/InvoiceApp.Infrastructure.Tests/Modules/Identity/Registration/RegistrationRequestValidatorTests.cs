using InvoiceApp.Application.Exceptions;
using InvoiceApp.Application.Identity;
using InvoiceApp.Modules.Identity.Registration;

namespace InvoiceApp.Infrastructure.Tests.Modules.Identity.Registration;

public class RegistrationRequestValidatorTests
{
    [Fact]
    public void Accepts_a_well_formed_request()
    {
        var request = new RegisterAccountRequest("new.user@example.com", "Password1", "Password1", "New User");

        var exception = Record.Exception(() => RegistrationRequestValidator.Validate(request));

        Assert.Null(exception);
    }

    [Theory]
    [InlineData("")]
    [InlineData("not-an-email")]
    [InlineData("missing-domain@")]
    public void Rejects_a_missing_or_malformed_email(string email)
    {
        var request = new RegisterAccountRequest(email, "Password1", "Password1", null);

        Assert.Throws<ValidationException>(() => RegistrationRequestValidator.Validate(request));
    }

    [Fact]
    public void Rejects_an_empty_password()
    {
        var request = new RegisterAccountRequest("new.user@example.com", "", "", null);

        Assert.Throws<ValidationException>(() => RegistrationRequestValidator.Validate(request));
    }

    [Fact]
    public void Rejects_a_confirm_password_that_does_not_match()
    {
        var request = new RegisterAccountRequest("new.user@example.com", "Password1", "Password2", null);

        var exception = Assert.Throws<ValidationException>(() => RegistrationRequestValidator.Validate(request));
        Assert.Contains("match", exception.Message, StringComparison.OrdinalIgnoreCase);
    }
}
