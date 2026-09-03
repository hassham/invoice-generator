namespace InvoiceApp.Application.Businesses;

/// <summary>All methods resolve the account's one Business row from <paramref name="userId"/>
/// internally, same precedent as ICustomerService/IInvoiceService - never a caller-supplied id.</summary>
public interface IBusinessService
{
    Task<BusinessProfileDto> GetAsync(Guid userId, CancellationToken cancellationToken);

    Task<BusinessProfileDto> UpdateAsync(Guid userId, BusinessProfileRequest request, CancellationToken cancellationToken);

    /// <summary>IG-54 / FSD section 64: formats the account's current InvoicePrefix/
    /// NextInvoiceNumber/InvoiceNumberPadding into a suggested invoice number, then increments
    /// NextInvoiceNumber so the next call/generation produces a different one.</summary>
    Task<GeneratedInvoiceNumberDto> GenerateNextInvoiceNumberAsync(Guid userId, CancellationToken cancellationToken);
}
