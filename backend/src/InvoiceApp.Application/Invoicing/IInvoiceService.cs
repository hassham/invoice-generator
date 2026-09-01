namespace InvoiceApp.Application.Invoicing;

/// <summary>
/// One upsert method backs both POST (create, invoiceId null) and PUT (update, invoiceId set) -
/// same request shape either way (IG-45 AC: "Manual save stores a valid account-owned invoice").
/// Account ownership is enforced internally from userId, same precedent as ICustomerService - a
/// caller can never save under, or overwrite, another account's invoice.
/// </summary>
public interface IInvoiceService
{
    Task<InvoiceDto> SaveAsync(Guid userId, Guid? invoiceId, InvoiceSaveRequest request, CancellationToken cancellationToken);

    Task<InvoiceDetailDto> GetAsync(Guid userId, Guid invoiceId, CancellationToken cancellationToken);

    Task<InvoiceListResponse> ListAsync(Guid userId, InvoiceListQuery query, CancellationToken cancellationToken);

    /// <summary>FSD section 52: idempotent (cancelling an already-cancelled invoice is a no-op,
    /// same precedent as ICustomerService.ArchiveAsync) - but throws ConflictException for a Paid
    /// invoice, since there's no reversal mechanic (Epic IG-11) to un-do the money already
    /// received.</summary>
    Task<InvoiceDto> CancelAsync(Guid userId, Guid invoiceId, CancellationToken cancellationToken);

    /// <summary>FSD section 53: always a soft delete (IsDeleted/DeletedAt), regardless of status -
    /// "prefer soft deletion... do not permanently remove financial history" applied uniformly
    /// rather than branching a real hard-delete path this codebase has never had.</summary>
    Task DeleteAsync(Guid userId, Guid invoiceId, CancellationToken cancellationToken);

    /// <summary>FSD section 51: creates a new Draft invoice copying Customer/Items/Tax
    /// settings/Notes/Terms/Template - never Invoice Number, Reference, Payments, or Status.</summary>
    Task<InvoiceDto> DuplicateAsync(Guid userId, Guid invoiceId, CancellationToken cancellationToken);
}
