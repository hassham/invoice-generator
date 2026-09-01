namespace InvoiceApp.Application.Businesses;

/// <summary>Both methods resolve the account's one Business row from <paramref name="userId"/>
/// internally, same precedent as ICustomerService/IInvoiceService - never a caller-supplied id.</summary>
public interface IBusinessService
{
    Task<BusinessProfileDto> GetAsync(Guid userId, CancellationToken cancellationToken);

    Task<BusinessProfileDto> UpdateAsync(Guid userId, BusinessProfileRequest request, CancellationToken cancellationToken);
}
