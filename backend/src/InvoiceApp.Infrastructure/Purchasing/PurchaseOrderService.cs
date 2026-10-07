using System.Globalization;
using System.Text.Json;
using InvoiceApp.Application.Purchasing;
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

        var poNumber = await NextPurchaseOrderNumberAsync(businessId, command.IssueDate, cancellationToken);

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
            SupplierSnapshot = JsonSerializer.Serialize(new { supplier.BusinessName, supplier.ContactName, supplier.Email }),
            BusinessSnapshot = JsonSerializer.Serialize(new { business.BusinessName, business.Email }),
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
            .OrderByDescending(po => po.IssueDate)
            .ThenByDescending(po => po.PONumber)
            .ToListAsync(cancellationToken);

        return pos.Select(MapToDto).ToList();
    }

    public async Task<List<PurchaseOrderDto>> ListBySupplierAsync(Guid userId, Guid businessId, Guid supplierId, CancellationToken cancellationToken)
    {
        var business = await dbContext.Businesses.FirstOrDefaultAsync(b => b.Id == businessId && b.UserId == userId, cancellationToken)
            ?? throw new InvalidOperationException("Business not found.");

        var pos = await dbContext.PurchaseOrders
            .Where(po => po.BusinessId == businessId && po.SupplierId == supplierId && !po.IsDeleted)
            .OrderByDescending(po => po.IssueDate)
            .ThenByDescending(po => po.PONumber)
            .ToListAsync(cancellationToken);

        return pos.Select(MapToDto).ToList();
    }

    public async Task<PurchaseOrderDto> GetAsync(Guid userId, Guid businessId, Guid id, CancellationToken cancellationToken)
    {
        var business = await dbContext.Businesses.FirstOrDefaultAsync(b => b.Id == businessId && b.UserId == userId, cancellationToken)
            ?? throw new InvalidOperationException("Business not found.");

        var po = await dbContext.PurchaseOrders.FirstOrDefaultAsync(po => po.Id == id && po.BusinessId == businessId && !po.IsDeleted, cancellationToken)
            ?? throw new InvalidOperationException("Purchase order not found.");

        return MapToDto(po);
    }

    public async Task DeleteAsync(Guid userId, Guid businessId, Guid id, CancellationToken cancellationToken)
    {
        var business = await dbContext.Businesses.FirstOrDefaultAsync(b => b.Id == businessId && b.UserId == userId, cancellationToken)
            ?? throw new InvalidOperationException("Business not found.");

        var po = await dbContext.PurchaseOrders.FirstOrDefaultAsync(po => po.Id == id && po.BusinessId == businessId && !po.IsDeleted, cancellationToken)
            ?? throw new InvalidOperationException("Purchase order not found.");

        po.IsDeleted = true;
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    /// <summary>
    /// Numbers are derived from the purchase order's own issue date, not today's date, and the
    /// sequence is read back from the stored numbers rather than a row count: a count silently
    /// reuses a number once a row is soft-deleted, and keying the sequence off a different date
    /// than the one embedded in the number meant every backdated purchase order collided on
    /// PO-{today}-001 (IG-292).
    /// </summary>
    private async Task<string> NextPurchaseOrderNumberAsync(Guid businessId, DateOnly issueDate, CancellationToken cancellationToken)
    {
        var prefix = $"PO-{issueDate.ToString("yyyyMMdd", CultureInfo.InvariantCulture)}-";

        var issued = await dbContext.PurchaseOrders
            .Where(po => po.BusinessId == businessId && po.PONumber.StartsWith(prefix))
            .Select(po => po.PONumber)
            .ToListAsync(cancellationToken);

        var nextSequence = issued
            .Select(number => int.TryParse(number[prefix.Length..], NumberStyles.None, CultureInfo.InvariantCulture, out var sequence) ? sequence : 0)
            .DefaultIfEmpty(0)
            .Max() + 1;

        return $"{prefix}{nextSequence:D3}";
    }

    private static PurchaseOrderDto MapToDto(PurchaseOrder po)
    {
        var supplier = Deserialize<SupplierSnapshot>(po.SupplierSnapshot);
        var business = Deserialize<BusinessSnapshot>(po.BusinessSnapshot);

        return new(po.Id, po.BusinessId, business?.BusinessName ?? string.Empty,
            po.SupplierId, supplier?.BusinessName ?? supplier?.ContactName ?? string.Empty,
            po.PONumber, po.IssueDate, po.DueDate,
            po.Currency, po.Reference, po.Subtotal, po.TaxAmount, po.TotalAmount,
            po.Notes, po.Terms, po.DeliveryInstructions, po.CreatedAt, po.UpdatedAt);
    }

    private static T? Deserialize<T>(string snapshot) where T : class
    {
        try
        {
            return JsonSerializer.Deserialize<T>(snapshot, SnapshotJsonOptions);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private static readonly JsonSerializerOptions SnapshotJsonOptions = new() { PropertyNameCaseInsensitive = true };

    private sealed record SupplierSnapshot(string? BusinessName, string? ContactName, string? Email);

    private sealed record BusinessSnapshot(string? BusinessName, string? Email);
}
