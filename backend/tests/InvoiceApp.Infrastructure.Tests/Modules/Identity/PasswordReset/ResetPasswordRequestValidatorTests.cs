using InvoiceApp.Application.Exceptions;
using InvoiceApp.Application.Identity;
using InvoiceApp.Modules.Identity.PasswordReset;

namespace InvoiceApp.Infrastructure.Tests.Modules.Identity.PasswordReset;

public class ResetPasswordRequestValidatorTests
{
    [Fact]
    public void Accepts_a_request_with_matching_passwords_and_all_fields_present()
    {
        var request = new ResetPasswordRequest("someone@example.com", "some-token", "NewPassword1", "NewPassword1");

        var exception = Record.Exception(() => ResetPasswordRequestValidator.Validate(request));

        Assert.Null(exception);
    }

    [Fact]
    public void Rejects_a_missing_email()
    {
        var request = new ResetPasswordRequest("", "some-token", "NewPassword1", "NewPassword1");

        Assert.Throws<ValidationException>(() => ResetPasswordRequestValidator.Validate(request));
    }

    [Fact]
    public void Rejects_a_missing_token()
    {
        var request = new ResetPasswordRequest("someone@example.com", "", "NewPassword1", "NewPassword1");

        Assert.Throws<ValidationException>(() => ResetPasswordRequestValidator.Validate(request));
    }

    [Fact]
    public void Rejects_a_missing_new_password()
    {
        var request = new ResetPasswordRequest("someone@example.com", "some-token", "", "");

        Assert.Throws<ValidationException>(() => ResetPasswordRequestValidator.Validate(request));
    }

    [Fact]
    public void Rejects_mismatched_new_password_and_confirmation()
    {
        var request = new ResetPasswordRequest("someone@example.com", "some-token", "NewPassword1", "DifferentPassword1");

        Assert.Throws<ValidationException>(() => ResetPasswordRequestValidator.Validate(request));
    }
}
