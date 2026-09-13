using System.Text.Json;
using InvoiceApp.Application.Audit;
using InvoiceApp.Application.Documents;
using InvoiceApp.Application.Exceptions;
using InvoiceApp.Application.Invoicing;
using InvoiceApp.Domain.Businesses;
using InvoiceApp.Domain.Customers;
using InvoiceApp.Domain.Invoicing;
using InvoiceApp.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace InvoiceApp.Infrastructure.Invoicing;

public sealed class InvoiceService(ApplicationDbContext dbContext, IAuditLogService auditLogService) : IInvoiceService
{
    public async Task<InvoiceDto> SaveAsync(Guid userId, Guid? invoiceId, InvoiceSaveRequest request, CancellationToken cancellationToken)
    {
        var businessId = await ResolveBusinessIdAsync(userId, cancellationToken);

        var invoice = invoiceId is { } id
            ? await LoadOwnedAsync(businessId, id, cancellationToken)
            : new Invoice
            {
                Id = Guid.NewGuid(),
                BusinessId = businessId,
                Status = InvoiceStatus.Draft,
                CreatedAt = DateTimeOffset.UtcNow,
                // IG-215: generated once, at creation, for every invoice going forward - never
                // regenerated on later updates (Invoice.PublicToken's own doc comment).
                PublicToken = await GenerateUniquePublicTokenAsync(cancellationToken),
            };

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

        // FSD sections 83/107: rides along in the SaveChangesAsync call below, not a separate one -
        // the audit entry and the invoice write it describes commit atomically together.
        await auditLogService.RecordAsync(
            userId,
            businessId,
            "Invoice",
            invoice.Id,
            invoiceId is null ? "Invoice created" : "Invoice updated",
            new { invoice.InvoiceNumber, invoice.Status },
            cancellationToken);

        await dbContext.SaveChangesAsync(cancellationToken);

        return ToDto(invoice);
    }

    public async Task<InvoiceDetailDto> GetAsync(Guid userId, Guid invoiceId, CancellationToken cancellationToken)
    {
        var businessId = await ResolveBusinessIdAsync(userId, cancellationToken);
        var invoice = await LoadOwnedAsync(businessId, invoiceId, cancellationToken);
        return ToDetailDto(invoice);
    }

    /// <summary>IG-214: anonymous - the token itself is the authorization, there's no userId/
    /// session involved. IG-215: an unknown/invalid/soft-deleted token 404s with the exact same
    /// generic message as "belongs to someone else" everywhere else in this class - never
    /// distinguishable from the caller's side.</summary>
    public async Task<HostedInvoiceDto> GetHostedInvoiceAsync(string token, CancellationToken cancellationToken)
    {
        var invoice = await LoadByPublicTokenAsync(token, cancellationToken);
        var business = await dbContext.Businesses.SingleAsync(b => b.Id == invoice.BusinessId, cancellationToken);

        return new HostedInvoiceDto(
            business.BusinessName,
            business.LogoUrl,
            invoice.InvoiceNumber,
            EffectiveStatus(invoice),
            invoice.IssueDate,
            invoice.DueDate,
            invoice.Currency,
            invoice.TotalAmount,
            invoice.AmountDue);
    }

    /// <summary>IG-214's "Download PDF" action. Builds the same InvoicePdfRequest shape the
    /// stateless /api/v1/invoices/pdf endpoint accepts from the frontend (see
    /// frontend/app/lib/invoiceDetailPdf.ts's buildInvoicePdfPayloadFromEditable for the client-side
    /// equivalent of this exact mapping), but from a saved Invoice loaded server-side by token
    /// rather than a payload the caller supplies - there was no prior server-side "Invoice -> PDF"
    /// path to reuse.</summary>
    public async Task<InvoicePdfRequest> BuildHostedInvoicePdfRequestAsync(string token, CancellationToken cancellationToken)
    {
        var invoice = await LoadByPublicTokenAsync(token, cancellationToken);
        return await BuildPdfRequestAsync(invoice, cancellationToken);
    }

    public async Task<InvoiceEmailContext> PrepareInvoiceEmailAsync(Guid userId, Guid invoiceId, CancellationToken cancellationToken)
    {
        var businessId = await ResolveBusinessIdAsync(userId, cancellationToken);
        var invoice = await LoadOwnedAsync(businessId, invoiceId, cancellationToken);

        if (invoice.PublicToken is null)
        {
            invoice.PublicToken = await GenerateUniquePublicTokenAsync(cancellationToken);
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        var business = await dbContext.Businesses.SingleAsync(b => b.Id == businessId, cancellationToken);
        var pdfRequest = await BuildPdfRequestAsync(invoice, cancellationToken);

        return new InvoiceEmailContext(pdfRequest, invoice.PublicToken, business.Email);
    }

    public async Task<InvoiceDto> CancelAsync(Guid userId, Guid invoiceId, CancellationToken cancellationToken)
    {
        var businessId = await ResolveBusinessIdAsync(userId, cancellationToken);
        var invoice = await LoadOwnedAsync(businessId, invoiceId, cancellationToken);

        // FSD section 52: a Paid invoice has already received real money with no reversal
        // mechanic (Epic IG-11) - a genuinely disallowed transition, not the "already cancelled"
        // idempotent case below.
        if (invoice.Status == InvoiceStatus.Paid)
        {
            throw new ConflictException("A paid invoice cannot be cancelled.");
        }

        if (invoice.Status != InvoiceStatus.Cancelled)
        {
            invoice.Status = InvoiceStatus.Cancelled;
            invoice.UpdatedAt = DateTimeOffset.UtcNow;

            await auditLogService.RecordAsync(userId, businessId, "Invoice", invoice.Id, "Invoice cancelled", new { invoice.InvoiceNumber }, cancellationToken);

            await dbContext.SaveChangesAsync(cancellationToken);
        }

        return ToDto(invoice);
    }

    public async Task DeleteAsync(Guid userId, Guid invoiceId, CancellationToken cancellationToken)
    {
        var businessId = await ResolveBusinessIdAsync(userId, cancellationToken);
        var invoice = await LoadOwnedAsync(businessId, invoiceId, cancellationToken);

        invoice.IsDeleted = true;
        invoice.DeletedAt = DateTimeOffset.UtcNow;

        await auditLogService.RecordAsync(userId, businessId, "Invoice", invoice.Id, "Invoice deleted", new { invoice.InvoiceNumber, invoice.Status }, cancellationToken);

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<InvoiceDto> DuplicateAsync(Guid userId, Guid invoiceId, CancellationToken cancellationToken)
    {
        var businessId = await ResolveBusinessIdAsync(userId, cancellationToken);
        var source = await LoadOwnedAsync(businessId, invoiceId, cancellationToken);

        // FSD section 51: "Issue date: Current date" / "Due date: calculated using current
        // default terms" - no configured default-terms setting exists yet (IG-54/Epic IG-8), so
        // the source's own issue-to-due day offset is preserved relative to today as the closest
        // available approximation.
        var issueDate = DateOnly.FromDateTime(DateTimeOffset.UtcNow.Date);
        var termDays = source.DueDate.DayNumber - source.IssueDate.DayNumber;
        var dueDate = issueDate.AddDays(termDays);
        var invoiceNumber = await GenerateDuplicateInvoiceNumberAsync(businessId, source.InvoiceNumber, cancellationToken);

        var duplicate = new Invoice
        {
            Id = Guid.NewGuid(),
            BusinessId = businessId,
            CustomerId = source.CustomerId,
            InvoiceNumber = invoiceNumber,
            Status = InvoiceStatus.Draft,
            IssueDate = issueDate,
            DueDate = dueDate,
            Currency = source.Currency,
            Reference = null,
            // ShipTo rides inside CustomerSnapshot (IG-47) - copying it verbatim carries Customer
            // and ShipTo together, matching FSD's "Customer" as one copied unit.
            CustomerSnapshot = source.CustomerSnapshot,
            SellerSnapshot = source.SellerSnapshot,
            DiscountType = source.DiscountType,
            DiscountValue = source.DiscountValue,
            // Copied directly rather than recalculated - items/discount are unchanged, so this
            // guarantees the duplicate shows identical figures with no risk of a second
            // calculation pass drifting from the source (e.g. rounding).
            Subtotal = source.Subtotal,
            DiscountAmount = source.DiscountAmount,
            TaxAmount = source.TaxAmount,
            TotalAmount = source.TotalAmount,
            AmountPaid = 0,
            AmountDue = source.TotalAmount,
            Notes = source.Notes,
            Terms = source.Terms,
            PaymentInstructions = source.PaymentInstructions,
            TemplateId = source.TemplateId,
            TemplateSettings = source.TemplateSettings,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };
        dbContext.Invoices.Add(duplicate);

        foreach (var item in source.Items.OrderBy(i => i.SortOrder))
        {
            // Added directly to the DbSet, not via `duplicate.Items.Add(...)` - see SaveAsync's
            // own comment on why a client-generated Guid key needs this to be tracked as Added.
            dbContext.InvoiceItems.Add(new InvoiceItem
            {
                Id = Guid.NewGuid(),
                InvoiceId = duplicate.Id,
                Description = item.Description,
                Quantity = item.Quantity,
                Unit = item.Unit,
                UnitPrice = item.UnitPrice,
                TaxRate = item.TaxRate,
                Discount = item.Discount,
                LineSubtotal = item.LineSubtotal,
                TaxAmount = item.TaxAmount,
                LineTotal = item.LineTotal,
                SortOrder = item.SortOrder,
            });
        }

        await auditLogService.RecordAsync(
            userId,
            businessId,
            "Invoice",
            duplicate.Id,
            "Invoice duplicated",
            new { duplicate.InvoiceNumber, SourceInvoiceId = source.Id, SourceInvoiceNumber = source.InvoiceNumber },
            cancellationToken);

        await dbContext.SaveChangesAsync(cancellationToken);

        return ToDto(duplicate);
    }

    /// <summary>No numbering generator exists yet (IG-46) - appends "-COPY", then "-2"/"-3"/...
    /// on collision, satisfying "the new invoice has an independent identifier" without inventing
    /// IG-46's own prefix/sequence scheme.</summary>
    private async Task<string> GenerateDuplicateInvoiceNumberAsync(Guid businessId, string sourceInvoiceNumber, CancellationToken cancellationToken)
    {
        var baseNumber = $"{sourceInvoiceNumber}-COPY";
        var candidate = baseNumber;
        var suffix = 1;
        while (await dbContext.Invoices.AnyAsync(invoice => invoice.BusinessId == businessId && invoice.InvoiceNumber == candidate && !invoice.IsDeleted, cancellationToken))
        {
            suffix++;
            candidate = $"{baseNumber}-{suffix}";
        }

        return candidate;
    }

    public async Task<InvoiceListResponse> ListAsync(Guid userId, InvoiceListQuery query, CancellationToken cancellationToken)
    {
        var businessId = await ResolveBusinessIdAsync(userId, cancellationToken);
        // FSD section 112: default 25 per page, with 25/50/100 offered as the frontend's page-size
        // choices - 100 is the upper bound the backend enforces either way, but any value in
        // between is accepted rather than snapped to exactly one of those three, so a missing or
        // out-of-range value just falls back to the default rather than erroring.
        var effectivePageSize = query.PageSize is >= 1 and <= 100 ? query.PageSize : 25;
        var effectivePage = query.Page < 1 ? 1 : query.Page;
        var today = DateOnly.FromDateTime(DateTimeOffset.UtcNow.Date);

        // Joined up front (not just for the final projection) so search can match against the
        // linked customer's own fields (FSD section 46) alongside the invoice's own. EffectiveStatus
        // mirrors InvoiceStatusRules.DetermineEffectiveStatus (IG-50) - inlined rather than called,
        // since EF Core can't translate an arbitrary method call into SQL - so both filtering and
        // display treat Overdue as computed, not the raw stored Status column.
        var filtered =
            from invoice in dbContext.Invoices
            join customer in dbContext.Customers on invoice.CustomerId equals customer.Id
            where invoice.BusinessId == businessId && !invoice.IsDeleted
            select new
            {
                invoice,
                customer,
                EffectiveStatus = invoice.Status != InvoiceStatus.Paid && invoice.Status != InvoiceStatus.Cancelled
                    && invoice.DueDate < today && invoice.AmountDue > 0
                        ? InvoiceStatus.Overdue
                        : invoice.Status,
            };

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = query.Search.Trim().ToLower();
            filtered = filtered.Where(row =>
                row.invoice.InvoiceNumber.ToLower().Contains(term) ||
                (row.invoice.Reference != null && row.invoice.Reference.ToLower().Contains(term)) ||
                (row.customer.BusinessName != null && row.customer.BusinessName.ToLower().Contains(term)) ||
                (row.customer.ContactName != null && row.customer.ContactName.ToLower().Contains(term)) ||
                (row.customer.Email != null && row.customer.Email.ToLower().Contains(term)));
        }

        if (query.Status is { } status)
        {
            filtered = filtered.Where(row => row.EffectiveStatus == status);
        }

        if (query.CustomerId is { } customerId)
        {
            filtered = filtered.Where(row => row.invoice.CustomerId == customerId);
        }

        // FSD section 47's Date filter scopes by issue date - same convention IG-60's dashboard
        // period filter already established.
        if (query.StartDate is { } startDate)
        {
            filtered = filtered.Where(row => row.invoice.IssueDate >= startDate);
        }

        if (query.EndDate is { } endDate)
        {
            filtered = filtered.Where(row => row.invoice.IssueDate <= endDate);
        }

        filtered = query.Sort switch
        {
            InvoiceSortOption.Oldest => filtered.OrderBy(row => row.invoice.CreatedAt),
            InvoiceSortOption.AmountHighest => filtered.OrderByDescending(row => row.invoice.TotalAmount),
            InvoiceSortOption.AmountLowest => filtered.OrderBy(row => row.invoice.TotalAmount),
            InvoiceSortOption.DueDate => filtered.OrderBy(row => row.invoice.DueDate),
            _ => filtered.OrderByDescending(row => row.invoice.CreatedAt), // Newest - default, matches IG-62's original behavior
        };

        var totalCount = await filtered.CountAsync(cancellationToken);

        var items = await filtered
            .Skip((effectivePage - 1) * effectivePageSize)
            .Take(effectivePageSize)
            .Select(row => new InvoiceListItemDto(
                row.invoice.Id,
                row.invoice.InvoiceNumber,
                row.customer.BusinessName ?? row.customer.ContactName ?? string.Empty,
                row.EffectiveStatus,
                row.invoice.IssueDate,
                row.invoice.DueDate,
                row.invoice.Currency,
                row.invoice.TotalAmount,
                row.invoice.AmountDue))
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

    /// <summary>IG-215: an empty/unrecognized/soft-deleted token all 404 identically - see
    /// GetHostedInvoiceAsync's own doc comment.</summary>
    private async Task<Invoice> LoadByPublicTokenAsync(string token, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            throw new NotFoundException("Invoice not found.");
        }

        var invoice = await dbContext.Invoices
            .Include(i => i.Items)
            .SingleOrDefaultAsync(i => i.PublicToken == token && !i.IsDeleted, cancellationToken);

        return invoice ?? throw new NotFoundException("Invoice not found.");
    }

    /// <summary>Collision odds are astronomically low at 93 bits of entropy (see
    /// PublicInvoiceTokenGenerator's own doc comment) - this loop exists purely as defense in
    /// depth, matching GenerateDuplicateInvoiceNumberAsync's own "generate, check, retry"
    /// precedent elsewhere in this class, not because a collision is expected in practice.</summary>
    private async Task<string> GenerateUniquePublicTokenAsync(CancellationToken cancellationToken)
    {
        string candidate;
        do
        {
            candidate = PublicInvoiceTokenGenerator.Generate();
        }
        while (await dbContext.Invoices.AnyAsync(invoice => invoice.PublicToken == candidate, cancellationToken));

        return candidate;
    }

    private async Task<InvoicePdfRequest> BuildPdfRequestAsync(Invoice invoice, CancellationToken cancellationToken)
    {
        var seller = JsonSerializer.Deserialize<SellerSnapshotPayload>(invoice.SellerSnapshot);
        var customer = JsonSerializer.Deserialize<CustomerSnapshotPayload>(invoice.CustomerSnapshot);

        string? templateCode = null;
        if (invoice.TemplateId is { } templateId)
        {
            templateCode = await dbContext.Templates
                .Where(template => template.Id == templateId)
                .Select(template => template.TemplateCode)
                .SingleOrDefaultAsync(cancellationToken);
        }

        InvoiceTemplateCustomization? templateCustomization = null;
        if (invoice.TemplateSettings is not null)
        {
            var saved = JsonSerializer.Deserialize<InvoiceSaveTemplateCustomization>(invoice.TemplateSettings);
            templateCustomization = saved is null
                ? null
                : new InvoiceTemplateCustomization(saved.PrimaryColor, saved.AccentColor, saved.Font, saved.HeaderStyle);
        }

        return new InvoicePdfRequest(
            invoice.InvoiceNumber,
            invoice.IssueDate,
            invoice.DueDate,
            invoice.Reference,
            invoice.Currency,
            seller?.Text ?? string.Empty,
            customer?.Text ?? string.Empty,
            customer?.ShipTo,
            invoice.Items
                .OrderBy(item => item.SortOrder)
                .Select(item => new InvoicePdfLineItem(item.Description, item.Quantity, item.Unit, item.UnitPrice, item.TaxRate, item.Discount))
                .ToList(),
            invoice.DiscountType,
            invoice.DiscountValue,
            // No per-invoice tax-calculation-method column exists (IG-46's own documented gap) -
            // same "Exclusive" fallback InvoiceCalculator itself already assumes for a saved
            // invoice's totals.
            TaxCalculationMethod.Exclusive,
            invoice.Notes,
            invoice.Terms,
            // Same "flat column rides in as CustomInstructions, no structured fields" mapping
            // frontend/app/lib/invoiceDetailPdf.ts's buildInvoicePdfPayloadFromEditable already
            // uses for a saved invoice.
            invoice.PaymentInstructions,
            null,
            templateCode,
            templateCustomization,
            // Not included - client-resized data URL, no server-side equivalent exists yet
            // (matches buildInvoicePdfPayloadFromEditable's own documented gap, not a new one).
            null);
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

    private static InvoiceStatus EffectiveStatus(Invoice invoice) => InvoiceStatusRules.DetermineEffectiveStatus(
        invoice.Status, invoice.DueDate, invoice.AmountDue, DateOnly.FromDateTime(DateTimeOffset.UtcNow.Date));

    private static InvoiceDto ToDto(Invoice invoice) => new(
        invoice.Id,
        invoice.CustomerId,
        invoice.InvoiceNumber,
        EffectiveStatus(invoice),
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
            EffectiveStatus(invoice),
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
