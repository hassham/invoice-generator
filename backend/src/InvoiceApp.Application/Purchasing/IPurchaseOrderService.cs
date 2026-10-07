namespace InvoiceApp.Application.Purchasing;

public interface IPurchaseOrderService
{
    Task<PurchaseOrderDto> CreateAsync(Guid userId, Guid businessId, CreatePurchaseOrderCommand command, CancellationToken cancellationToken);
    Task<List<PurchaseOrderDto>> ListByBusinessAsync(Guid userId, Guid businessId, CancellationToken cancellationToken);
    Task<List<PurchaseOrderDto>> ListBySupplierAsync(Guid userId, Guid businessId, Guid supplierId, CancellationToken cancellationToken);
    Task<PurchaseOrderDto> GetAsync(Guid userId, Guid businessId, Guid id, CancellationToken cancellationToken);
    Task DeleteAsync(Guid userId, Guid businessId, Guid id, CancellationToken cancellationToken);
}
