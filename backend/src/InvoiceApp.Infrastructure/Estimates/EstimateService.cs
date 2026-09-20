using System.Text.Json;
using InvoiceApp.Application.Audit;
using InvoiceApp.Application.Documents;
using InvoiceApp.Application.Estimates;
using InvoiceApp.Application.Exceptions;
using InvoiceApp.Application.Invoicing;
using InvoiceApp.Domain.Businesses;
using InvoiceApp.Domain.Customers;
using InvoiceApp.Domain.Estimates;
using InvoiceApp.Domain.Invoicing;
using InvoiceApp.Infrastructure.Invoicing;
using InvoiceApp.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace InvoiceApp.Infrastructure.Estimates;

/// <summary>
/// IG-220: mirrors InvoiceService's SaveAsync/GetAsync/ListAsync structure closely - same
/// find-or-create customer resolution, same snapshot-at-save-time approach, same InvoiceCalculator
/// reuse (unchanged, fully generic - see InvoiceCalculator's own doc comment). IG-221 adds
/// email/hosted-page methods mirroring IInvoiceService's own equivalents. Deliberately narrower
/// than IInvoiceService: no Cancel/Delete/Duplicate/Accept/Decline/Convert exist yet - out of this
/// Story's scope (see IEstimateService's own doc comment).
/// </summary>
public sealed class EstimateService(ApplicationDbContext dbContext, IAuditLogService auditLogService) : IEstimateService
{
    public async Task<EstimateDto> SaveAsync(Guid userId, Guid? estimateId, EstimateSaveRequest request, CancellationToken cancellationToken)
    {
        var businessId = await ResolveBusinessIdAsync(userId, cancellationToken);

        var estimate = estimateId is { } id
            ? await LoadOwnedAsync(businessId, id, cancellationToken)
            : new Estimate
            {
                Id = Guid.NewGuid(),
                BusinessId = businessId,
                Status = EstimateStatus.Draft,
                CreatedAt = DateTimeOffset.UtcNow,
            };

        if (estimateId is null)
        {
            dbContext.Estimates.Add(estimate);
        }
        else
        {
            dbContext.EstimateItems.RemoveRange(estimate.Items.ToList());
            estimate.Items.Clear();
        }

        var trimmedEstimateNumber = request.EstimateNumber.Trim();
        var numberTaken = await dbContext.Estimates.AnyAsync(
            existing => existing.BusinessId == businessId && existing.EstimateNumber == trimmedEstimateNumber && existing.Id != estimate.Id && !existing.IsDeleted,
            cancellationToken);
        if (numberTaken)
        {
            throw new ConflictException("An estimate with this number already exists.");
        }

        estimate.CustomerId = request.CustomerId is { } selectedCustomerId
            ? await ResolveSelectedCustomerAsync(businessId, selectedCustomerId, cancellationToken)
            : await ResolveOrCreateCustomerAsync(businessId, request.Customer, cancellationToken);

        var calculation = InvoiceCalculator.Calculate(new InvoiceCalculationRequest(
            request.Items.Select(item => new InvoiceLineItemCalculationInput(item.Quantity, item.UnitPrice, item.TaxRate, item.Discount)).ToList(),
            request.DiscountType,
            request.DiscountValue,
            request.TaxCalculationMethod));

        estimate.EstimateNumber = trimmedEstimateNumber;
        estimate.IssueDate = request.IssueDate;
        estimate.ExpiryDate = request.ExpiryDate;
        estimate.Currency = request.Currency.Trim();
        estimate.Reference = NullIfEmpty(request.Reference);
        estimate.SellerSnapshot = JsonSerializer.Serialize(new SellerSnapshotPayload(request.Seller));
        estimate.CustomerSnapshot = JsonSerializer.Serialize(new CustomerSnapshotPayload(request.Customer, NullIfEmpty(request.ShipTo)));
        estimate.DiscountType = request.DiscountType;
        estimate.DiscountValue = request.DiscountValue;
        estimate.Subtotal = calculation.Subtotal;
        estimate.DiscountAmount = calculation.DiscountAmount;
        estimate.TaxAmount = calculation.TaxAmount;
        estimate.TotalAmount = calculation.TotalAmount;
        estimate.Notes = NullIfEmpty(request.Notes);
        estimate.Terms = NullIfEmpty(request.Terms);
        estimate.PaymentInstructions = FormatPaymentInstructions(request.PaymentInstructions, request.CustomInstructions);
        estimate.TemplateId = request.TemplateId;
        estimate.TemplateSettings = request.TemplateCustomization is null ? null : JsonSerializer.Serialize(request.TemplateCustomization);
        estimate.UpdatedAt = DateTimeOffset.UtcNow;

        for (var i = 0; i < request.Items.Count; i++)
        {
            var item = request.Items[i];
            var lineResult = calculation.Items[i];
            dbContext.EstimateItems.Add(new EstimateItem
            {
                Id = Guid.NewGuid(),
                EstimateId = estimate.Id,
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

        await auditLogService.RecordAsync(
            userId,
            businessId,
            "Estimate",
            estimate.Id,
            estimateId is null ? "Estimate created" : "Estimate updated",
            new { estimate.EstimateNumber, estimate.Status },
            cancellationToken);

        await dbContext.SaveChangesAsync(cancellationToken);

        return ToDto(estimate);
    }

    public async Task<EstimateDetailDto> GetAsync(Guid userId, Guid estimateId, CancellationToken cancellationToken)
    {
        var businessId = await ResolveBusinessIdAsync(userId, cancellationToken);
        var estimate = await LoadOwnedAsync(businessId, estimateId, cancellationToken);
        return ToDetailDto(estimate);
    }

    public async Task<EstimateListResponse> ListAsync(Guid userId, EstimateListQuery query, CancellationToken cancellationToken)
    {
        var businessId = await ResolveBusinessIdAsync(userId, cancellationToken);
        var effectivePageSize = query.PageSize is >= 1 and <= 100 ? query.PageSize : 25;
        var effectivePage = query.Page < 1 ? 1 : query.Page;

        var filtered =
            from estimate in dbContext.Estimates
            join customer in dbContext.Customers on estimate.CustomerId equals customer.Id
            where estimate.BusinessId == businessId && !estimate.IsDeleted
            select new { estimate, customer };

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = query.Search.Trim().ToLower();
            filtered = filtered.Where(row =>
                row.estimate.EstimateNumber.ToLower().Contains(term) ||
                (row.estimate.Reference != null && row.estimate.Reference.ToLower().Contains(term)) ||
                (row.customer.BusinessName != null && row.customer.BusinessName.ToLower().Contains(term)) ||
                (row.customer.ContactName != null && row.customer.ContactName.ToLower().Contains(term)));
        }

        if (query.Status is { } status)
        {
            filtered = filtered.Where(row => row.estimate.Status == status);
        }

        filtered = filtered.OrderByDescending(row => row.estimate.CreatedAt);

        var totalCount = await filtered.CountAsync(cancellationToken);

        var items = await filtered
            .Skip((effectivePage - 1) * effectivePageSize)
            .Take(effectivePageSize)
            .Select(row => new EstimateListItemDto(
                row.estimate.Id,
                row.estimate.EstimateNumber,
                row.customer.BusinessName ?? row.customer.ContactName ?? string.Empty,
                row.estimate.Status,
                row.estimate.IssueDate,
                row.estimate.ExpiryDate,
                row.estimate.Currency,
                row.estimate.TotalAmount))
            .ToListAsync(cancellationToken);

        return new EstimateListResponse(items, effectivePage, effectivePageSize, totalCount);
    }

    /// <summary>IG-221: anonymous - the token itself is the authorization, same precedent as
    /// InvoiceService.GetHostedInvoiceAsync, including the identical generic-404 behavior for an
    /// unknown/invalid/soft-deleted token.</summary>
    public async Task<HostedEstimateDto> GetHostedEstimateAsync(string token, CancellationToken cancellationToken)
    {
        var estimate = await LoadByPublicTokenAsync(token, cancellationToken);
        var business = await dbContext.Businesses.SingleAsync(b => b.Id == estimate.BusinessId, cancellationToken);

        return new HostedEstimateDto(
            business.BusinessName,
            business.LogoUrl,
            estimate.EstimateNumber,
            estimate.Status,
            estimate.IssueDate,
            estimate.ExpiryDate,
            estimate.Currency,
            estimate.TotalAmount);
    }

    public async Task<InvoicePdfRequest> BuildHostedEstimatePdfRequestAsync(string token, CancellationToken cancellationToken)
    {
        var estimate = await LoadByPublicTokenAsync(token, cancellationToken);
        return await BuildPdfRequestAsync(estimate, cancellationToken);
    }

    public async Task<InvoiceEmailContext> PrepareEstimateEmailAsync(Guid userId, Guid estimateId, CancellationToken cancellationToken)
    {
        var businessId = await ResolveBusinessIdAsync(userId, cancellationToken);
        var estimate = await LoadOwnedAsync(businessId, estimateId, cancellationToken);

        if (estimate.PublicToken is null)
        {
            estimate.PublicToken = await GenerateUniqueEstimatePublicTokenAsync(cancellationToken);
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        var business = await dbContext.Businesses.SingleAsync(b => b.Id == businessId, cancellationToken);
        var pdfRequest = await BuildPdfRequestAsync(estimate, cancellationToken);

        return new InvoiceEmailContext(pdfRequest, estimate.PublicToken, business.Email);
    }

    public async Task RecordEstimateEmailSentAsync(Guid userId, Guid estimateId, InvoiceEmailRequest request, InvoiceEmailStatus status, string? errorMessage, CancellationToken cancellationToken)
    {
        var businessId = await ResolveBusinessIdAsync(userId, cancellationToken);
        var owned = await dbContext.Estimates.SingleOrDefaultAsync(e => e.Id == estimateId && e.BusinessId == businessId && !e.IsDeleted, cancellationToken);
        if (owned is null)
        {
            throw new NotFoundException("Estimate not found.");
        }

        dbContext.EstimateEmailLogs.Add(new EstimateEmailLog
        {
            Id = Guid.NewGuid(),
            EstimateId = estimateId,
            SentAt = DateTimeOffset.UtcNow,
            To = JsonSerializer.Serialize(request.To),
            Cc = JsonSerializer.Serialize(request.Cc),
            Subject = request.Subject,
            Status = status,
            ErrorMessage = errorMessage,
        });

        // IG-221 AC: sending transitions status to Sent. IG-262: "exactly once" - only a genuinely
        // successful send moves it, and only forward from Draft; an estimate already Sent (a
        // resend) or already Accepted/Declined/Converted is never regressed back to Sent.
        if (status == InvoiceEmailStatus.Sent && owned.Status == EstimateStatus.Draft)
        {
            owned.Status = EstimateStatus.Sent;
            owned.UpdatedAt = DateTimeOffset.UtcNow;
        }

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<InvoiceEmailLogDto>> GetEstimateEmailHistoryAsync(Guid userId, Guid estimateId, CancellationToken cancellationToken)
    {
        var businessId = await ResolveBusinessIdAsync(userId, cancellationToken);
        var owned = await dbContext.Estimates.AnyAsync(e => e.Id == estimateId && e.BusinessId == businessId && !e.IsDeleted, cancellationToken);
        if (!owned)
        {
            throw new NotFoundException("Estimate not found.");
        }

        var logs = await dbContext.EstimateEmailLogs
            .Where(log => log.EstimateId == estimateId)
            .OrderByDescending(log => log.SentAt)
            .ToListAsync(cancellationToken);

        return logs
            .Select(log => new InvoiceEmailLogDto(
                log.Id,
                log.SentAt,
                JsonSerializer.Deserialize<List<string>>(log.To) ?? [],
                JsonSerializer.Deserialize<List<string>>(log.Cc) ?? [],
                log.Subject,
                log.Status))
            .ToList();
    }

    /// <summary>Same narrow mapping as InvoiceService.ResolveOrCreateCustomerAsync - duplicated
    /// rather than shared, matching this codebase's existing precedent of small cross-service
    /// duplication over a forced abstraction (PaymentService/InvoiceService already duplicate their
    /// own ToInvoiceDto-style mappings the same way).</summary>
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

    private async Task<Estimate> LoadOwnedAsync(Guid businessId, Guid estimateId, CancellationToken cancellationToken)
    {
        var estimate = await dbContext.Estimates
            .Include(e => e.Items)
            .SingleOrDefaultAsync(e => e.Id == estimateId && e.BusinessId == businessId && !e.IsDeleted, cancellationToken);

        return estimate ?? throw new NotFoundException("Estimate not found.");
    }

    /// <summary>IG-221: an empty/unrecognized/soft-deleted token all 404 identically - see
    /// GetHostedEstimateAsync's own doc comment.</summary>
    private async Task<Estimate> LoadByPublicTokenAsync(string token, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            throw new NotFoundException("Estimate not found.");
        }

        var estimate = await dbContext.Estimates
            .Include(e => e.Items)
            .SingleOrDefaultAsync(e => e.PublicToken == token && !e.IsDeleted, cancellationToken);

        return estimate ?? throw new NotFoundException("Estimate not found.");
    }

    /// <summary>Reuses PublicInvoiceTokenGenerator as-is (pure string generation, no Invoice
    /// coupling) - collision odds are the same astronomically low 93 bits of entropy.</summary>
    private async Task<string> GenerateUniqueEstimatePublicTokenAsync(CancellationToken cancellationToken)
    {
        string candidate;
        do
        {
            candidate = PublicInvoiceTokenGenerator.Generate();
        }
        while (await dbContext.Estimates.AnyAsync(estimate => estimate.PublicToken == candidate, cancellationToken));

        return candidate;
    }

    private async Task<InvoicePdfRequest> BuildPdfRequestAsync(Estimate estimate, CancellationToken cancellationToken)
    {
        var seller = JsonSerializer.Deserialize<SellerSnapshotPayload>(estimate.SellerSnapshot);
        var customer = JsonSerializer.Deserialize<CustomerSnapshotPayload>(estimate.CustomerSnapshot);

        string? templateCode = null;
        if (estimate.TemplateId is { } templateId)
        {
            templateCode = await dbContext.Templates
                .Where(template => template.Id == templateId)
                .Select(template => template.TemplateCode)
                .SingleOrDefaultAsync(cancellationToken);
        }

        InvoiceTemplateCustomization? templateCustomization = null;
        if (estimate.TemplateSettings is not null)
        {
            var saved = JsonSerializer.Deserialize<EstimateSaveTemplateCustomization>(estimate.TemplateSettings);
            templateCustomization = saved is null
                ? null
                : new InvoiceTemplateCustomization(saved.PrimaryColor, saved.AccentColor, saved.Font, saved.HeaderStyle);
        }

        return new InvoicePdfRequest(
            estimate.EstimateNumber,
            estimate.IssueDate,
            estimate.ExpiryDate,
            estimate.Reference,
            estimate.Currency,
            seller?.Text ?? string.Empty,
            customer?.Text ?? string.Empty,
            customer?.ShipTo,
            estimate.Items
                .OrderBy(item => item.SortOrder)
                .Select(item => new InvoicePdfLineItem(item.Description, item.Quantity, item.Unit, item.UnitPrice, item.TaxRate, item.Discount))
                .ToList(),
            estimate.DiscountType,
            estimate.DiscountValue,
            TaxCalculationMethod.Exclusive,
            estimate.Notes,
            estimate.Terms,
            estimate.PaymentInstructions,
            null,
            templateCode,
            templateCustomization,
            null,
            "Estimate");
    }

    private static string? NullIfEmpty(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    /// <summary>Mirrors InvoiceService.FormatPaymentInstructions exactly.</summary>
    private static string? FormatPaymentInstructions(EstimateSavePaymentInstructions? instructions, string? customInstructions)
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

    private static EstimateDto ToDto(Estimate estimate) => new(
        estimate.Id,
        estimate.CustomerId,
        estimate.EstimateNumber,
        estimate.Status,
        estimate.IssueDate,
        estimate.ExpiryDate,
        estimate.Currency,
        estimate.Reference,
        estimate.Subtotal,
        estimate.DiscountAmount,
        estimate.TaxAmount,
        estimate.TotalAmount,
        estimate.CreatedAt,
        estimate.UpdatedAt);

    private static EstimateDetailDto ToDetailDto(Estimate estimate)
    {
        var seller = JsonSerializer.Deserialize<SellerSnapshotPayload>(estimate.SellerSnapshot);
        var customer = JsonSerializer.Deserialize<CustomerSnapshotPayload>(estimate.CustomerSnapshot);
        var templateCustomization = estimate.TemplateSettings is null
            ? null
            : JsonSerializer.Deserialize<EstimateSaveTemplateCustomization>(estimate.TemplateSettings);

        return new EstimateDetailDto(
            estimate.Id,
            estimate.CustomerId,
            estimate.EstimateNumber,
            estimate.Status,
            estimate.IssueDate,
            estimate.ExpiryDate,
            estimate.Reference,
            estimate.Currency,
            seller?.Text ?? string.Empty,
            customer?.Text ?? string.Empty,
            customer?.ShipTo,
            estimate.Items
                .OrderBy(item => item.SortOrder)
                .Select(item => new EstimateDetailLineItem(item.Description, item.Quantity, item.Unit, item.UnitPrice, item.TaxRate, item.Discount))
                .ToList(),
            estimate.DiscountType,
            estimate.DiscountValue,
            estimate.Notes,
            estimate.Terms,
            estimate.PaymentInstructions,
            estimate.TemplateId,
            templateCustomization,
            estimate.Subtotal,
            estimate.DiscountAmount,
            estimate.TaxAmount,
            estimate.TotalAmount,
            estimate.CreatedAt,
            estimate.UpdatedAt);
    }

    private sealed record SellerSnapshotPayload(string Text);

    private sealed record CustomerSnapshotPayload(string Text, string? ShipTo);
}
