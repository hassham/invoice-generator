namespace InvoiceApp.Application.Catalog;

/// <summary>
/// Every method resolves account ownership from <paramref name="userId"/> internally (via that
/// user's business), not from a caller-supplied business id - same precedent as
/// ICustomerService/IBusinessService (Jira IG-57 AC: "account ownership is enforced").
/// </summary>
public interface ICatalogItemService
{
    Task<IReadOnlyList<CatalogItemDto>> ListAsync(Guid userId, bool includeArchived, CancellationToken cancellationToken);

    Task<CatalogItemDto> GetAsync(Guid userId, Guid itemId, CancellationToken cancellationToken);

    Task<CatalogItemDto> CreateAsync(Guid userId, CatalogItemRequest request, CancellationToken cancellationToken);

    Task<CatalogItemDto> UpdateAsync(Guid userId, Guid itemId, CatalogItemRequest request, CancellationToken cancellationToken);

    Task ArchiveAsync(Guid userId, Guid itemId, CancellationToken cancellationToken);

    /// <summary>FSD section 59's "Duplicate" list action: creates a new, independent item with the
    /// same field values (never archived, regardless of the source item's own archive state) -
    /// not a reference to the original, so later edits to either don't affect the other.</summary>
    Task<CatalogItemDto> DuplicateAsync(Guid userId, Guid itemId, CancellationToken cancellationToken);
}
