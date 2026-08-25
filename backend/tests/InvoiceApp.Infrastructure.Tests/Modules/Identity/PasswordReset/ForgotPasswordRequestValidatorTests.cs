using InvoiceApp.Application.Exceptions;
using InvoiceApp.Application.Identity;
using InvoiceApp.Modules.Identity.PasswordReset;

namespace InvoiceApp.Infrastructure.Tests.Modules.Identity.PasswordReset;

public class ForgotPasswordRequestValidatorTests
{
    [Fact]
    public void Accepts_a_well_formed_email()
    {
        var request = new ForgotPasswordRequest("someone@example.com");

        var exception = Record.Exception(() => ForgotPasswordRequestValidator.Validate(request));

        Assert.Null(exception);
    }

    [Theory]
    [InlineData("")]
    [InlineData("not-an-email")]
    [InlineData("missing-domain@")]
    public void Rejects_a_missing_or_malformed_email(string email)
    {
        var request = new ForgotPasswordRequest(email);

        Assert.Throws<ValidationException>(() => ForgotPasswordRequestValidator.Validate(request));
    }
}
