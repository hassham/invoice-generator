using InvoiceApp.Application.Exceptions;
using InvoiceApp.Application.Identity;
using InvoiceApp.Modules.Identity.Login;

namespace InvoiceApp.Infrastructure.Tests.Modules.Identity.Login;

public class LoginRequestValidatorTests
{
    [Fact]
    public void Accepts_a_request_with_both_fields_present()
    {
        var request = new LoginRequest("user@example.com", "whatever-value", RememberMe: false);

        var exception = Record.Exception(() => LoginRequestValidator.Validate(request));

        Assert.Null(exception);
    }

    [Fact]
    public void Rejects_a_missing_email()
    {
        var request = new LoginRequest("", "whatever-value", RememberMe: false);

        Assert.Throws<ValidationException>(() => LoginRequestValidator.Validate(request));
    }

    [Fact]
    public void Rejects_a_missing_password()
    {
        var request = new LoginRequest("user@example.com", "", RememberMe: false);

        Assert.Throws<ValidationException>(() => LoginRequestValidator.Validate(request));
    }
}
