namespace InvoiceApp.Application.Identity;

/// <summary>
/// Soft-deletes the authenticated account after re-confirming the current password (FSD 76:
/// password confirmation required before deletion). The account row and its business/invoice
/// data are retained - FSD 76 recommends soft-delete first, then a permanent purge after a
/// retention period, which is not implemented here since no retention duration is documented
/// anywhere. Marking the account deleted is what makes it unusable going forward: rejected at the
/// next login (ICredentialLoginService) and on every subsequent authenticated request for any
/// session, not only the one that performed the deletion (Infrastructure's cookie
/// OnValidatePrincipal check).
/// </summary>
public interface IAccountDeletionService
{
    Task DeleteAsync(Guid userId, string currentPassword, CancellationToken cancellationToken);
}
