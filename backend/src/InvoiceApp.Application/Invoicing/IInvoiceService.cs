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
}
