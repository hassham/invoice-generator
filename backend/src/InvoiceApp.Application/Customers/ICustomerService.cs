namespace InvoiceApp.Application.Customers;

/// <summary>
/// Every method resolves account ownership from <paramref name="userId"/> internally (via that
/// user's business), not from a caller-supplied business id - a request can only ever act on the
/// signed-in user's own customers (Jira IG-55 AC: "account ownership is enforced").
/// </summary>
public interface ICustomerService
{
    Task<IReadOnlyList<CustomerDto>> ListAsync(Guid userId, bool includeArchived, CancellationToken cancellationToken);

    Task<CustomerDto> GetAsync(Guid userId, Guid customerId, CancellationToken cancellationToken);

    Task<CustomerDto> CreateAsync(Guid userId, CustomerRequest request, CancellationToken cancellationToken);

    Task<CustomerDto> UpdateAsync(Guid userId, Guid customerId, CustomerRequest request, CancellationToken cancellationToken);

    Task ArchiveAsync(Guid userId, Guid customerId, CancellationToken cancellationToken);
}
