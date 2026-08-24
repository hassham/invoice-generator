using InvoiceApp.Application.Exceptions;
using InvoiceApp.Application.Identity;

namespace InvoiceApp.Modules.Identity.AccountDeletion;

/// <summary>
/// Only checks the field is present - correctness of the password itself is checked against the
/// stored account (IAccountDeletionService), not against a policy.
/// </summary>
public static class DeleteAccountRequestValidator
{
    public static void Validate(DeleteAccountRequest request)
    {
        if (string.IsNullOrEmpty(request.CurrentPassword))
        {
            throw new ValidationException("Current password is required.");
        }
    }
}
