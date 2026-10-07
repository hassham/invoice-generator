using System.Globalization;
using System.Text.Json;
using InvoiceApp.Application.Documents;
using InvoiceApp.Application.Purchasing;
using InvoiceApp.Domain.Businesses;
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

        // IG-307: the create UI enforces all three of these before it posts, but the frontend is
        // only ever a convenience - AGENTS.md makes the backend authoritative for validation, and
        // until now this endpoint would happily store an order with no lines at all, or one
        // required before it was issued.
        if (command.Items == null || command.Items.Count == 0)
            throw new InvalidOperationException("A purchase order needs at least one line item.");

        if (string.IsNullOrWhiteSpace(command.Currency))
            throw new InvalidOperationException("Currency is required.");

        if (command.DueDate < command.IssueDate)
            throw new InvalidOperationException("Required by date cannot be before the issue date.");

        var poNumber = await NextPurchaseOrderNumberAsync(businessId, command.IssueDate, cancellationToken);

        var lines = command.Items.Select((item, index) =>
        {
            var lineSubtotal = (item.Quantity * item.UnitPrice) - item.Discount;
            var lineTax = lineSubtotal * (item.TaxRate / 100m);

            return new PurchaseOrderItem
            {
                Id = Guid.NewGuid(),
                Description = item.Description,
                Quantity = item.Quantity,
                Unit = string.IsNullOrWhiteSpace(item.Unit) ? null : item.Unit.Trim(),
                UnitPrice = item.UnitPrice,
                TaxRate = item.TaxRate,
                Discount = item.Discount,
                LineSubtotal = lineSubtotal,
                TaxAmount = lineTax,
                LineTotal = lineSubtotal + lineTax,
                SortOrder = index,
            };
        }).ToList();

        var subtotal = lines.Sum(line => line.LineSubtotal);
        var taxAmount = lines.Sum(line => line.TaxAmount);
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

        foreach (var line in lines)
        {
            line.PurchaseOrderId = po.Id;
            // Added straight to the DbSet rather than through po.Items, for the reason
            // InvoiceService documents: a client-generated non-default Guid key discovered only by
            // navigation fixup is tracked as Modified, and SaveChanges then tries to update a row
            // that was never inserted.
            dbContext.PurchaseOrderItems.Add(line);
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        return MapToDto(po, lines);
    }

    public async Task<List<PurchaseOrderDto>> ListByBusinessAsync(Guid userId, Guid businessId, CancellationToken cancellationToken)
    {
        var business = await dbContext.Businesses.FirstOrDefaultAsync(b => b.Id == businessId && b.UserId == userId, cancellationToken)
            ?? throw new InvalidOperationException("Business not found.");

        var pos = await dbContext.PurchaseOrders
            .Include(po => po.Items)
            .Where(po => po.BusinessId == businessId && !po.IsDeleted)
            .OrderByDescending(po => po.IssueDate)
            .ThenByDescending(po => po.PONumber)
            .ToListAsync(cancellationToken);

        return pos.Select(po => MapToDto(po, po.Items)).ToList();
    }

    public async Task<List<PurchaseOrderDto>> ListBySupplierAsync(Guid userId, Guid businessId, Guid supplierId, CancellationToken cancellationToken)
    {
        var business = await dbContext.Businesses.FirstOrDefaultAsync(b => b.Id == businessId && b.UserId == userId, cancellationToken)
            ?? throw new InvalidOperationException("Business not found.");

        var pos = await dbContext.PurchaseOrders
            .Include(po => po.Items)
            .Where(po => po.BusinessId == businessId && po.SupplierId == supplierId && !po.IsDeleted)
            .OrderByDescending(po => po.IssueDate)
            .ThenByDescending(po => po.PONumber)
            .ToListAsync(cancellationToken);

        return pos.Select(po => MapToDto(po, po.Items)).ToList();
    }

    public async Task<PurchaseOrderDto> GetAsync(Guid userId, Guid businessId, Guid id, CancellationToken cancellationToken)
    {
        var business = await dbContext.Businesses.FirstOrDefaultAsync(b => b.Id == businessId && b.UserId == userId, cancellationToken)
            ?? throw new InvalidOperationException("Business not found.");

        var po = await dbContext.PurchaseOrders
            .Include(po => po.Items)
            .FirstOrDefaultAsync(po => po.Id == id && po.BusinessId == businessId && !po.IsDeleted, cancellationToken)
            ?? throw new InvalidOperationException("Purchase order not found.");

        return MapToDto(po, po.Items);
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

    public async Task<InvoicePdfRequest> GetPdfRequestAsync(Guid userId, Guid businessId, Guid id, CancellationToken cancellationToken)
    {
        _ = await dbContext.Businesses.FirstOrDefaultAsync(b => b.Id == businessId && b.UserId == userId, cancellationToken)
            ?? throw new InvalidOperationException("Business not found.");

        var po = await dbContext.PurchaseOrders
            .Include(po => po.Items)
            .FirstOrDefaultAsync(po => po.Id == id && po.BusinessId == businessId && !po.IsDeleted, cancellationToken)
            ?? throw new InvalidOperationException("Purchase order not found.");

        var supplier = Deserialize<SupplierSnapshot>(po.SupplierSnapshot);
        var business = Deserialize<BusinessSnapshot>(po.BusinessSnapshot);

        string? templateCode = null;
        if (po.TemplateId is { } templateId)
        {
            templateCode = await dbContext.Templates
                .Where(template => template.Id == templateId)
                .Select(template => template.TemplateCode)
                .SingleOrDefaultAsync(cancellationToken);
        }

        var templateCustomization = po.TemplateSettings is null
            ? null
            : Deserialize<InvoiceTemplateCustomization>(po.TemplateSettings);

        return new InvoicePdfRequest(
            po.PONumber,
            po.IssueDate,
            po.DueDate,
            po.Reference,
            po.Currency,
            business?.BusinessName ?? string.Empty,
            supplier?.BusinessName ?? supplier?.ContactName ?? string.Empty,
            null,
            po.Items
                .OrderBy(item => item.SortOrder)
                .Select(item => new InvoicePdfLineItem(item.Description, item.Quantity, item.Unit, item.UnitPrice, item.TaxRate, item.Discount))
                .ToList(),
            DiscountType.None,
            null,
            TaxCalculationMethod.Exclusive,
            po.Notes,
            po.Terms,
            // DeliveryInstructions is deliberately not mapped to CustomInstructions: that field
            // renders under a "Payment Instructions" heading, which would mislabel it on a
            // purchase order.
            null,
            null,
            templateCode,
            templateCustomization,
            null,
            "Purchase Order",
            "Supplier");
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

    private static PurchaseOrderDto MapToDto(PurchaseOrder po, IEnumerable<PurchaseOrderItem> items)
    {
        var supplier = Deserialize<SupplierSnapshot>(po.SupplierSnapshot);
        var business = Deserialize<BusinessSnapshot>(po.BusinessSnapshot);

        var lines = items
            .OrderBy(item => item.SortOrder)
            .Select(item => new PurchaseOrderItemDto(
                item.Description, item.Quantity, item.Unit, item.UnitPrice, item.TaxRate,
                item.Discount, item.LineSubtotal, item.TaxAmount, item.LineTotal))
            .ToList();

        return new(po.Id, po.BusinessId, business?.BusinessName ?? string.Empty,
            po.SupplierId, supplier?.BusinessName ?? supplier?.ContactName ?? string.Empty,
            po.PONumber, po.IssueDate, po.DueDate,
            po.Currency, po.Reference, po.Subtotal, po.TaxAmount, po.TotalAmount,
            po.Notes, po.Terms, po.DeliveryInstructions, lines, po.CreatedAt, po.UpdatedAt);
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
