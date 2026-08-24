using InvoiceApp.Application.Exceptions;
using InvoiceApp.Application.Identity;
using InvoiceApp.Modules.Identity.AccountDeletion;

namespace InvoiceApp.Infrastructure.Tests.Modules.Identity.AccountDeletion;

public class DeleteAccountRequestValidatorTests
{
    [Fact]
    public void Accepts_a_request_with_the_password_present()
    {
        var request = new DeleteAccountRequest("whatever-value");

        var exception = Record.Exception(() => DeleteAccountRequestValidator.Validate(request));

        Assert.Null(exception);
    }

    [Fact]
    public void Rejects_a_missing_password()
    {
        var request = new DeleteAccountRequest("");

        Assert.Throws<ValidationException>(() => DeleteAccountRequestValidator.Validate(request));
    }
}
