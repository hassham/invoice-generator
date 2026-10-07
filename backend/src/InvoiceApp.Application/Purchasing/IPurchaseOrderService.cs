using InvoiceApp.Application.Documents;

namespace InvoiceApp.Application.Purchasing;

public interface IPurchaseOrderService
{
    Task<PurchaseOrderDto> CreateAsync(Guid userId, Guid businessId, CreatePurchaseOrderCommand command, CancellationToken cancellationToken);
    Task<List<PurchaseOrderDto>> ListByBusinessAsync(Guid userId, Guid businessId, CancellationToken cancellationToken);
    Task<List<PurchaseOrderDto>> ListBySupplierAsync(Guid userId, Guid businessId, Guid supplierId, CancellationToken cancellationToken);
    Task<PurchaseOrderDto> GetAsync(Guid userId, Guid businessId, Guid id, CancellationToken cancellationToken);
    Task DeleteAsync(Guid userId, Guid businessId, Guid id, CancellationToken cancellationToken);

    /// <summary>
    /// Maps a stored purchase order onto the shared invoice PDF contract, so it renders through
    /// the same document engine and templates as invoices and estimates (IG-236).
    /// </summary>
    Task<InvoicePdfRequest> GetPdfRequestAsync(Guid userId, Guid businessId, Guid id, CancellationToken cancellationToken);
}
