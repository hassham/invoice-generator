namespace InvoiceApp.Application.Customers;

/// <summary>
/// Every method takes the business the request is scoped to (IG-296 / IG-295). Ownership is checked
/// against <paramref name="userId"/>: a business that belongs to another account, or a customer that
/// belongs to a different business, is reported as not found (Jira IG-55 AC: "account ownership is enforced").
/// </summary>
public interface ICustomerService
{
    Task<IReadOnlyList<CustomerDto>> ListAsync(Guid userId, Guid businessId, bool includeArchived, CancellationToken cancellationToken);

    Task<CustomerDto> GetAsync(Guid userId, Guid businessId, Guid customerId, CancellationToken cancellationToken);

    Task<CustomerDto> CreateAsync(Guid userId, Guid businessId, CustomerRequest request, CancellationToken cancellationToken);

    Task<CustomerDto> UpdateAsync(Guid userId, Guid businessId, Guid customerId, CustomerRequest request, CancellationToken cancellationToken);

    Task ArchiveAsync(Guid userId, Guid businessId, Guid customerId, CancellationToken cancellationToken);
}
