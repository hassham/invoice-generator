using InvoiceApp.Application.Purchasing;
using InvoiceApp.Domain.Invoicing;
using InvoiceApp.Domain.Purchasing;
using InvoiceApp.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace InvoiceApp.Infrastructure.Purchasing;

public sealed class PurchaseOrderService(ApplicationDbContext dbContext) : IPurchaseOrderService
{
    public async Task<PurchaseOrderDto> CreateAsync(Guid userId, Guid businessId, CreatePurchaseOrderCommand command, CancellationToken cancellationToken)
    {
        var business = await dbContext.Businesses.FirstOrDefaultAsync(b => b.Id == businessId && b.UserId == userId, cancellationToken)
            ?? throw new InvalidOperationException("Business not found.");

        var supplier = await dbContext.Customers.FirstOrDefaultAsync(c => c.Id == command.SupplierId && c.BusinessId == businessId, cancellationToken)
            ?? throw new InvalidOperationException("Supplier not found.");

        var issueDate = DateOnly.FromDateTime(DateTime.Now);
        var sequenceNumber = await dbContext.PurchaseOrders
            .Where(po => po.BusinessId == businessId && po.IssueDate == issueDate)
            .CountAsync(cancellationToken) + 1;

        var poNumber = $"PO-{issueDate:yyyyMMdd}-{sequenceNumber:D3}";

        var items = command.Items;
        var subtotal = items.Sum(i => (i.Quantity * i.UnitPrice) - i.Discount);
        var taxAmount = items.Sum(i => ((i.Quantity * i.UnitPrice) - i.Discount) * (i.TaxRate / 100m));
        var totalAmount = subtotal + taxAmount;

        var po = new PurchaseOrder
        {
            Id = Guid.NewGuid(),
            BusinessId = businessId,
            SupplierId = command.SupplierId,
            PONumber = poNumber,
            IssueDate = command.IssueDate,
            DueDate = command.DueDate,
            Currency = command.Currency,
            Reference = command.Reference,
            SupplierSnapshot = System.Text.Json.JsonSerializer.Serialize(new { supplier.BusinessName, supplier.ContactName, supplier.Email }),
            BusinessSnapshot = System.Text.Json.JsonSerializer.Serialize(new { business.BusinessName, business.Email }),
            Subtotal = subtotal,
            TaxAmount = taxAmount,
            TotalAmount = totalAmount,
            Notes = command.Notes,
            Terms = command.Terms,
            DeliveryInstructions = command.DeliveryInstructions,
            TemplateId = command.TemplateId,
            TemplateSettings = command.TemplateCustomization,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        dbContext.PurchaseOrders.Add(po);
        await dbContext.SaveChangesAsync(cancellationToken);

        return MapToDto(po);
    }

    public async Task<List<PurchaseOrderDto>> ListByBusinessAsync(Guid userId, Guid businessId, CancellationToken cancellationToken)
    {
        var business = await dbContext.Businesses.FirstOrDefaultAsync(b => b.Id == businessId && b.UserId == userId, cancellationToken)
            ?? throw new InvalidOperationException("Business not found.");

        var pos = await dbContext.PurchaseOrders
            .Where(po => po.BusinessId == businessId && !po.IsDeleted)
            .ToListAsync(cancellationToken);

        return pos.Select(MapToDto).ToList();
    }

    public async Task<List<PurchaseOrderDto>> ListBySupplierAsync(Guid userId, Guid businessId, Guid supplierId, CancellationToken cancellationToken)
    {
        var business = await dbContext.Businesses.FirstOrDefaultAsync(b => b.Id == businessId && b.UserId == userId, cancellationToken)
            ?? throw new InvalidOperationException("Business not found.");

        var pos = await dbContext.PurchaseOrders
            .Where(po => po.BusinessId == businessId && po.SupplierId == supplierId && !po.IsDeleted)
            .ToListAsync(cancellationToken);

        return pos.Select(MapToDto).ToList();
    }

    public async Task<PurchaseOrderDto> GetAsync(Guid userId, Guid businessId, Guid id, CancellationToken cancellationToken)
    {
        var business = await dbContext.Businesses.FirstOrDefaultAsync(b => b.Id == businessId && b.UserId == userId, cancellationToken)
            ?? throw new InvalidOperationException("Business not found.");

        var po = await dbContext.PurchaseOrders.FirstOrDefaultAsync(po => po.Id == id && po.BusinessId == businessId, cancellationToken)
            ?? throw new InvalidOperationException("Purchase order not found.");

        return MapToDto(po);
    }

    public async Task DeleteAsync(Guid userId, Guid businessId, Guid id, CancellationToken cancellationToken)
    {
        var business = await dbContext.Businesses.FirstOrDefaultAsync(b => b.Id == businessId && b.UserId == userId, cancellationToken)
            ?? throw new InvalidOperationException("Business not found.");

        var po = await dbContext.PurchaseOrders.FirstOrDefaultAsync(po => po.Id == id && po.BusinessId == businessId, cancellationToken)
            ?? throw new InvalidOperationException("Purchase order not found.");

        po.IsDeleted = true;
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private static PurchaseOrderDto MapToDto(PurchaseOrder po) =>
        new(po.Id, po.BusinessId, po.SupplierId, po.PONumber, po.IssueDate, po.DueDate,
            po.Currency, po.Reference, po.Subtotal, po.TaxAmount, po.TotalAmount,
            po.Notes, po.Terms, po.DeliveryInstructions, po.CreatedAt, po.UpdatedAt);
}
