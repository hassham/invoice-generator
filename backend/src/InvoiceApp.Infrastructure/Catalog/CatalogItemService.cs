using InvoiceApp.Application.Catalog;
using InvoiceApp.Application.Exceptions;
using InvoiceApp.Domain.Catalog;
using InvoiceApp.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace InvoiceApp.Infrastructure.Catalog;

public sealed class CatalogItemService(ApplicationDbContext dbContext) : ICatalogItemService
{
    public async Task<IReadOnlyList<CatalogItemDto>> ListAsync(Guid userId, Guid businessId, bool includeArchived, CancellationToken cancellationToken)
    {
        await EnsureOwnedBusinessAsync(userId, businessId, cancellationToken);

        var query = dbContext.CatalogItems.Where(item => item.BusinessId == businessId);
        if (!includeArchived)
        {
            query = query.Where(item => !item.IsArchived);
        }

        var items = await query.OrderBy(item => item.Name).ToListAsync(cancellationToken);
        return items.Select(ToDto).ToList();
    }

    public async Task<CatalogItemDto> GetAsync(Guid userId, Guid businessId, Guid itemId, CancellationToken cancellationToken)
    {
        var item = await FindOwnedAsync(userId, businessId, itemId, cancellationToken);
        return ToDto(item);
    }

    public async Task<CatalogItemDto> CreateAsync(Guid userId, Guid businessId, CatalogItemRequest request, CancellationToken cancellationToken)
    {
        await EnsureOwnedBusinessAsync(userId, businessId, cancellationToken);
        var now = DateTimeOffset.UtcNow;

        var item = new CatalogItem
        {
            Id = Guid.NewGuid(),
            BusinessId = businessId,
            Name = request.Name.Trim(),
            Description = request.Description,
            SKU = request.SKU,
            Unit = request.Unit,
            UnitPrice = request.UnitPrice,
            TaxRate = request.TaxRate,
            IsArchived = false,
            CreatedAt = now,
            UpdatedAt = now,
        };

        dbContext.CatalogItems.Add(item);
        await dbContext.SaveChangesAsync(cancellationToken);

        return ToDto(item);
    }

    public async Task<CatalogItemDto> UpdateAsync(Guid userId, Guid businessId, Guid itemId, CatalogItemRequest request, CancellationToken cancellationToken)
    {
        var item = await FindOwnedAsync(userId, businessId, itemId, cancellationToken);

        item.Name = request.Name.Trim();
        item.Description = request.Description;
        item.SKU = request.SKU;
        item.Unit = request.Unit;
        item.UnitPrice = request.UnitPrice;
        item.TaxRate = request.TaxRate;
        item.UpdatedAt = DateTimeOffset.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

        return ToDto(item);
    }

    public async Task ArchiveAsync(Guid userId, Guid businessId, Guid itemId, CancellationToken cancellationToken)
    {
        var item = await FindOwnedAsync(userId, businessId, itemId, cancellationToken);

        // FSD section 61: archive, never hard-delete - historical invoices store their own
        // snapshot of an item's fields (FSD section 25), not a live reference, but the catalogue
        // record itself is still kept rather than destroyed. Idempotent: archiving an
        // already-archived item is a no-op, not an error.
        item.IsArchived = true;
        item.UpdatedAt = DateTimeOffset.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<CatalogItemDto> DuplicateAsync(Guid userId, Guid businessId, Guid itemId, CancellationToken cancellationToken)
    {
        var source = await FindOwnedAsync(userId, businessId, itemId, cancellationToken);
        var now = DateTimeOffset.UtcNow;

        var duplicate = new CatalogItem
        {
            Id = Guid.NewGuid(),
            BusinessId = source.BusinessId,
            // FSD section 59's Duplicate action needs a distinguishable name, not a silent exact
            // copy that would be indistinguishable from the original in the list.
            Name = $"{source.Name} (Copy)",
            Description = source.Description,
            SKU = source.SKU,
            Unit = source.Unit,
            UnitPrice = source.UnitPrice,
            TaxRate = source.TaxRate,
            IsArchived = false,
            CreatedAt = now,
            UpdatedAt = now,
        };

        dbContext.CatalogItems.Add(duplicate);
        await dbContext.SaveChangesAsync(cancellationToken);

        return ToDto(duplicate);
    }

    /// <summary>The business must belong to the signed-in account. Not found and "belongs to
    /// someone else" return the same 404, so another account's business ids are never disclosed.</summary>
    private async Task EnsureOwnedBusinessAsync(Guid userId, Guid businessId, CancellationToken cancellationToken)
    {
        var owned = await dbContext.Businesses.AnyAsync(
            business => business.Id == businessId && business.UserId == userId,
            cancellationToken);

        if (!owned)
        {
            throw new NotFoundException("Business not found.");
        }
    }

    private async Task<CatalogItem> FindOwnedAsync(Guid userId, Guid businessId, Guid itemId, CancellationToken cancellationToken)
    {
        await EnsureOwnedBusinessAsync(userId, businessId, cancellationToken);

        // Not found and "belongs to someone else" return the same 404 - existence of another
        // account's item is never disclosed, same anti-enumeration precedent as
        // CustomerService.FindOwnedAsync.
        return await dbContext.CatalogItems.SingleOrDefaultAsync(
            item => item.Id == itemId && item.BusinessId == businessId,
            cancellationToken)
            ?? throw new NotFoundException("Item not found.");
    }

    private static CatalogItemDto ToDto(CatalogItem item) => new(
        item.Id,
        item.Name,
        item.Description,
        item.SKU,
        item.Unit,
        item.UnitPrice,
        item.TaxRate,
        item.IsArchived,
        item.CreatedAt,
        item.UpdatedAt);
}
