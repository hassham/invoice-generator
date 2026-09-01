using System.Text.Json;
using InvoiceApp.Application.Exceptions;
using InvoiceApp.Application.Invoicing;
using InvoiceApp.Domain.Customers;
using InvoiceApp.Domain.Invoicing;
using InvoiceApp.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace InvoiceApp.Infrastructure.Invoicing;

public sealed class InvoiceService(ApplicationDbContext dbContext) : IInvoiceService
{
    public async Task<InvoiceDto> SaveAsync(Guid userId, Guid? invoiceId, InvoiceSaveRequest request, CancellationToken cancellationToken)
    {
        var businessId = await ResolveBusinessIdAsync(userId, cancellationToken);

        var invoice = invoiceId is { } id
            ? await LoadOwnedAsync(businessId, id, cancellationToken)
            : new Invoice { Id = Guid.NewGuid(), BusinessId = businessId, Status = InvoiceStatus.Draft, CreatedAt = DateTimeOffset.UtcNow };

        if (invoiceId is null)
        {
            dbContext.Invoices.Add(invoice);
        }
        else
        {
            // A save always replaces the full item set rather than diffing - simplest correct
            // approach for a draft that's rewritten wholesale on every save/auto-save, and item
            // count/order is small enough that this is never a performance concern. Clearing the
            // navigation (not just marking the entities Deleted) matters - leaving deleted items
            // in `invoice.Items` while new ones are added below mixes Deleted and Added entries in
            // the same collection, and EF's relationship fixup on that mixed collection was
            // observed flipping a deleted item's state back before SaveChanges, which then fails
            // trying to update a row the same batch already deleted.
            dbContext.InvoiceItems.RemoveRange(invoice.Items.ToList());
            invoice.Items.Clear();
        }

        var trimmedInvoiceNumber = request.InvoiceNumber.Trim();
        // FSD section 65: "must be unique per business" with a friendly conflict message. Checked
        // explicitly here rather than relying on catching the DB's own unique-index violation -
        // that would need provider-specific exception handling (EF Core's InMemory test provider
        // doesn't enforce or report it the way the real Npgsql provider does), and a small
        // business's invoice-save traffic has no realistic concurrent-duplicate race to guard
        // against beyond this (that hardening is IG-46's explicit scope, not this Story's).
        var numberTaken = await dbContext.Invoices.AnyAsync(
            existing => existing.BusinessId == businessId && existing.InvoiceNumber == trimmedInvoiceNumber && existing.Id != invoice.Id && !existing.IsDeleted,
            cancellationToken);
        if (numberTaken)
        {
            throw new ConflictException("An invoice with this number already exists.");
        }

        invoice.CustomerId = request.CustomerId is { } selectedCustomerId
            ? await ResolveSelectedCustomerAsync(businessId, selectedCustomerId, cancellationToken)
            : await ResolveOrCreateCustomerAsync(businessId, request.Customer, cancellationToken);

        var calculation = InvoiceCalculator.Calculate(new InvoiceCalculationRequest(
            request.Items.Select(item => new InvoiceLineItemCalculationInput(item.Quantity, item.UnitPrice, item.TaxRate, item.Discount)).ToList(),
            request.InvoiceDiscountType,
            request.InvoiceDiscountValue,
            request.TaxCalculationMethod));

        invoice.InvoiceNumber = trimmedInvoiceNumber;
        invoice.IssueDate = request.IssueDate;
        invoice.DueDate = request.DueDate;
        invoice.Currency = request.Currency.Trim();
        invoice.Reference = NullIfEmpty(request.Reference);
        // No structured seller/customer fields exist to snapshot (IG-193 replaced them with free
        // text) - captures the free text verbatim as the closest available "as issued" record.
        // ShipTo has no DB column of its own, so it rides along in the customer snapshot (IG-47
        // fix: IG-45 accepted this field but never actually persisted it anywhere).
        invoice.SellerSnapshot = JsonSerializer.Serialize(new SellerSnapshotPayload(request.Seller));
        invoice.CustomerSnapshot = JsonSerializer.Serialize(new CustomerSnapshotPayload(request.Customer, NullIfEmpty(request.ShipTo)));
        invoice.DiscountType = request.InvoiceDiscountType;
        invoice.DiscountValue = request.InvoiceDiscountValue;
        invoice.Subtotal = calculation.Subtotal;
        invoice.DiscountAmount = calculation.DiscountAmount;
        invoice.TaxAmount = calculation.TaxAmount;
        invoice.TotalAmount = calculation.TotalAmount;
        // No payment recording exists yet (Epic IG-11) - AmountPaid stays 0, so AmountDue always
        // equals TotalAmount, same reasoning InvoiceCalculator itself documents.
        invoice.AmountDue = calculation.AmountDue;
        invoice.Notes = NullIfEmpty(request.Notes);
        invoice.Terms = NullIfEmpty(request.Terms);
        invoice.PaymentInstructions = FormatPaymentInstructions(request.PaymentInstructions, request.CustomInstructions);
        invoice.TemplateId = request.TemplateId;
        invoice.TemplateSettings = request.TemplateCustomization is null ? null : JsonSerializer.Serialize(request.TemplateCustomization);
        invoice.UpdatedAt = DateTimeOffset.UtcNow;

        for (var i = 0; i < request.Items.Count; i++)
        {
            var item = request.Items[i];
            var lineResult = calculation.Items[i];
            // Added directly to the DbSet, not via `invoice.Items.Add(...)` - a client-generated
            // (non-default) Guid key discovered only through navigation fixup gets tracked as
            // Modified rather than Added (EF Core assumes a non-default key means "already
            // exists" unless the entity was explicitly Add()-ed), which then fails at
            // SaveChanges trying to update a row that was never inserted.
            dbContext.InvoiceItems.Add(new InvoiceItem
            {
                Id = Guid.NewGuid(),
                InvoiceId = invoice.Id,
                Description = item.Description,
                Quantity = item.Quantity,
                Unit = NullIfEmpty(item.Unit),
                UnitPrice = item.UnitPrice,
                TaxRate = item.TaxRate,
                Discount = item.Discount,
                LineSubtotal = lineResult.LineSubtotal,
                TaxAmount = lineResult.TaxAmount,
                LineTotal = lineResult.LineTotal,
                SortOrder = i,
            });
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        return ToDto(invoice);
    }

    public async Task<InvoiceDetailDto> GetAsync(Guid userId, Guid invoiceId, CancellationToken cancellationToken)
    {
        var businessId = await ResolveBusinessIdAsync(userId, cancellationToken);
        var invoice = await LoadOwnedAsync(businessId, invoiceId, cancellationToken);
        return ToDetailDto(invoice);
    }

    public async Task<InvoiceListResponse> ListAsync(Guid userId, int page, int pageSize, CancellationToken cancellationToken)
    {
        var businessId = await ResolveBusinessIdAsync(userId, cancellationToken);
        // FSD section 112: default 25 per page, with 25/50/100 offered as the frontend's page-size
        // choices - 100 is the upper bound the backend enforces either way, but any value in
        // between is accepted rather than snapped to exactly one of those three, so a missing or
        // out-of-range value just falls back to the default rather than erroring.
        var effectivePageSize = pageSize is >= 1 and <= 100 ? pageSize : 25;
        var effectivePage = page < 1 ? 1 : page;

        var query = dbContext.Invoices
            .Where(invoice => invoice.BusinessId == businessId && !invoice.IsDeleted)
            .OrderByDescending(invoice => invoice.CreatedAt);

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .Skip((effectivePage - 1) * effectivePageSize)
            .Take(effectivePageSize)
            .Join(
                dbContext.Customers,
                invoice => invoice.CustomerId,
                customer => customer.Id,
                (invoice, customer) => new InvoiceListItemDto(
                    invoice.Id,
                    invoice.InvoiceNumber,
                    customer.BusinessName ?? customer.ContactName ?? string.Empty,
                    invoice.Status,
                    invoice.IssueDate,
                    invoice.DueDate,
                    invoice.Currency,
                    invoice.TotalAmount,
                    invoice.AmountDue))
            .ToListAsync(cancellationToken);

        return new InvoiceListResponse(items, effectivePage, effectivePageSize, totalCount);
    }

    /// <summary>IG-56: the caller picked an existing saved customer rather than typing free text -
    /// used directly once ownership is confirmed, bypassing the find-or-create heuristic below
    /// entirely (which would otherwise re-match by name text, a fragile way to honor an explicit
    /// selection). Same anti-enumeration precedent as elsewhere: a customer belonging to a
    /// different account 404s, not a more specific error.</summary>
    private async Task<Guid> ResolveSelectedCustomerAsync(Guid businessId, Guid customerId, CancellationToken cancellationToken)
    {
        var owned = await dbContext.Customers.AnyAsync(customer => customer.Id == customerId && customer.BusinessId == businessId, cancellationToken);
        return owned ? customerId : throw new NotFoundException("Customer not found.");
    }

    private async Task<Guid> ResolveBusinessIdAsync(Guid userId, CancellationToken cancellationToken) =>
        await dbContext.Businesses
            .Where(business => business.UserId == userId)
            .Select(business => business.Id)
            .SingleAsync(cancellationToken);

    private async Task<Invoice> LoadOwnedAsync(Guid businessId, Guid invoiceId, CancellationToken cancellationToken)
    {
        var invoice = await dbContext.Invoices
            .Include(i => i.Items)
            .SingleOrDefaultAsync(i => i.Id == invoiceId && i.BusinessId == businessId && !i.IsDeleted, cancellationToken);

        // Not found and "belongs to someone else" return the same 404 - same anti-enumeration
        // precedent used by CustomerService.
        return invoice ?? throw new NotFoundException("Invoice not found.");
    }

    /// <summary>
    /// IG-193 replaced structured customer fields with one free-text block, but the DB's
    /// `customer_id` FK needs a real Customer row (IG-55). Resolved, per explicit product
    /// direction: the block's first line is treated as the customer's name and matched
    /// case-insensitively against this account's existing customers (creating one if there's no
    /// match); any remaining lines are kept as that new customer's Notes so nothing typed is lost.
    /// An existing match's Notes are never overwritten - only a newly-created customer gets them.
    /// This is a deliberately narrow mapping, not the structured "select a saved customer" flow
    /// IG-56 will eventually add.
    /// </summary>
    private async Task<Guid> ResolveOrCreateCustomerAsync(Guid businessId, string customerText, CancellationToken cancellationToken)
    {
        var (name, notes) = SplitCustomerText(customerText);
        var lowerName = name.ToLowerInvariant();

        var existing = await dbContext.Customers
            .FirstOrDefaultAsync(
                customer => customer.BusinessId == businessId && customer.BusinessName != null && customer.BusinessName.ToLower() == lowerName,
                cancellationToken);
        if (existing is not null)
        {
            return existing.Id;
        }

        var now = DateTimeOffset.UtcNow;
        var customer = new Customer
        {
            Id = Guid.NewGuid(),
            BusinessId = businessId,
            BusinessName = name,
            Notes = notes,
            IsArchived = false,
            CreatedAt = now,
            UpdatedAt = now,
        };
        dbContext.Customers.Add(customer);
        return customer.Id;
    }

    private static (string Name, string? Notes) SplitCustomerText(string customerText)
    {
        var lines = customerText.Replace("\r\n", "\n").Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        var name = lines.Length > 0 ? lines[0] : customerText.Trim();
        if (name.Length > 200)
        {
            name = name[..200];
        }
        var notes = lines.Length > 1 ? string.Join("\n", lines.Skip(1)) : null;
        return (name, notes);
    }

    /// <summary>Collapses FSD section 32's 7 structured fields plus Custom Instructions into the
    /// one flat `payment_instructions` text column the DB actually has.</summary>
    private static string? FormatPaymentInstructions(InvoiceSavePaymentInstructions? instructions, string? customInstructions)
    {
        var lines = new List<string>();
        if (instructions is not null)
        {
            AddIfPresent(lines, "Bank Name", instructions.BankName);
            AddIfPresent(lines, "Account Name", instructions.AccountName);
            AddIfPresent(lines, "BSB / Routing Number", instructions.Bsb);
            AddIfPresent(lines, "Account Number", instructions.AccountNumber);
            AddIfPresent(lines, "IBAN", instructions.Iban);
            AddIfPresent(lines, "SWIFT", instructions.Swift);
            AddIfPresent(lines, "Payment Reference", instructions.PaymentReference);
        }

        if (!string.IsNullOrWhiteSpace(customInstructions))
        {
            if (lines.Count > 0)
            {
                lines.Add(string.Empty);
            }
            lines.Add(customInstructions.Trim());
        }

        return lines.Count > 0 ? string.Join("\n", lines) : null;
    }

    private static void AddIfPresent(List<string> lines, string label, string? value)
    {
        if (!string.IsNullOrWhiteSpace(value))
        {
            lines.Add($"{label}: {value.Trim()}");
        }
    }

    private static string? NullIfEmpty(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static InvoiceDto ToDto(Invoice invoice) => new(
        invoice.Id,
        invoice.CustomerId,
        invoice.InvoiceNumber,
        invoice.Status,
        invoice.IssueDate,
        invoice.DueDate,
        invoice.Currency,
        invoice.Reference,
        invoice.Subtotal,
        invoice.DiscountAmount,
        invoice.TaxAmount,
        invoice.TotalAmount,
        invoice.AmountPaid,
        invoice.AmountDue,
        invoice.CreatedAt,
        invoice.UpdatedAt);

    private static InvoiceDetailDto ToDetailDto(Invoice invoice)
    {
        var seller = JsonSerializer.Deserialize<SellerSnapshotPayload>(invoice.SellerSnapshot);
        var customer = JsonSerializer.Deserialize<CustomerSnapshotPayload>(invoice.CustomerSnapshot);
        var templateCustomization = invoice.TemplateSettings is null
            ? null
            : JsonSerializer.Deserialize<InvoiceSaveTemplateCustomization>(invoice.TemplateSettings);

        return new InvoiceDetailDto(
            invoice.Id,
            invoice.CustomerId,
            invoice.InvoiceNumber,
            invoice.Status,
            invoice.IssueDate,
            invoice.DueDate,
            invoice.Reference,
            invoice.Currency,
            seller?.Text ?? string.Empty,
            customer?.Text ?? string.Empty,
            customer?.ShipTo,
            invoice.Items
                .OrderBy(item => item.SortOrder)
                .Select(item => new InvoiceDetailLineItem(item.Description, item.Quantity, item.Unit, item.UnitPrice, item.TaxRate, item.Discount))
                .ToList(),
            invoice.DiscountType,
            invoice.DiscountValue,
            invoice.Notes,
            invoice.Terms,
            invoice.PaymentInstructions,
            invoice.TemplateId,
            templateCustomization,
            invoice.Subtotal,
            invoice.DiscountAmount,
            invoice.TaxAmount,
            invoice.TotalAmount,
            invoice.AmountPaid,
            invoice.AmountDue,
            invoice.CreatedAt,
            invoice.UpdatedAt);
    }

    private sealed record SellerSnapshotPayload(string Text);

    private sealed record CustomerSnapshotPayload(string Text, string? ShipTo);
}
