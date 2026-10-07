using System.Globalization;
using InvoiceApp.Application.Invoicing;
using InvoiceApp.Domain.Businesses;
using InvoiceApp.Domain.Invoicing;
using InvoiceApp.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace InvoiceApp.Infrastructure.Invoicing;

public sealed class CreditNoteService(ApplicationDbContext dbContext) : ICreditNoteService
{
    public async Task<CreditNoteDto> CreateAsync(
        Guid userId,
        Guid businessId,
        CreateCreditNoteCommand command,
        CancellationToken cancellationToken)
    {
        var business = await dbContext.Businesses
            .FirstOrDefaultAsync(b => b.Id == businessId && b.UserId == userId, cancellationToken);

        if (business == null)
            throw new InvalidOperationException("Business not found or access denied.");

        var invoice = await dbContext.Invoices
            .FirstOrDefaultAsync(i => i.Id == command.InvoiceId && i.BusinessId == businessId && !i.IsDeleted, cancellationToken);

        if (invoice == null)
            throw new InvalidOperationException("Invoice not found.");

        var maxCreditAmount = invoice.AmountDue;
        if (command.Amount > maxCreditAmount)
            throw new ArgumentException($"Credit note amount cannot exceed {maxCreditAmount:C}. Invoice amount due is {maxCreditAmount:C}.");

        var creditNoteNumber = await GenerateNextCreditNoteNumberAsync(dbContext, business, cancellationToken);

        var creditNote = new CreditNote
        {
            Id = Guid.NewGuid(),
            BusinessId = businessId,
            InvoiceId = command.InvoiceId,
            CustomerId = invoice.CustomerId,
            CreditNoteNumber = creditNoteNumber,
            IssueDate = DateOnly.FromDateTime(DateTime.UtcNow),
            Reason = command.Reason,
            Currency = invoice.Currency,
            Amount = command.Amount,
            Notes = command.Notes ?? string.Empty,
            SellerSnapshot = invoice.SellerSnapshot,
            CustomerSnapshot = invoice.CustomerSnapshot,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };

        dbContext.CreditNotes.Add(creditNote);
        await dbContext.SaveChangesAsync(cancellationToken);

        return MapToDto(creditNote);
    }

    public async Task<List<CreditNoteDto>> ListByInvoiceAsync(
        Guid userId,
        Guid businessId,
        Guid invoiceId,
        CancellationToken cancellationToken)
    {
        var business = await dbContext.Businesses
            .FirstOrDefaultAsync(b => b.Id == businessId && b.UserId == userId, cancellationToken);

        if (business == null)
            throw new InvalidOperationException("Business not found or access denied.");

        var creditNotes = await dbContext.CreditNotes
            .Where(cn => cn.InvoiceId == invoiceId && cn.BusinessId == businessId && !cn.IsDeleted)
            .OrderByDescending(cn => cn.CreatedAt)
            .ToListAsync(cancellationToken);

        return creditNotes.Select(MapToDto).ToList();
    }

    public async Task<List<CreditNoteDto>> ListByBusinessAsync(
        Guid userId,
        Guid businessId,
        CancellationToken cancellationToken)
    {
        var business = await dbContext.Businesses
            .FirstOrDefaultAsync(b => b.Id == businessId && b.UserId == userId, cancellationToken);

        if (business == null)
            throw new InvalidOperationException("Business not found or access denied.");

        var creditNotes = await dbContext.CreditNotes
            .Where(cn => cn.BusinessId == businessId && !cn.IsDeleted)
            .OrderByDescending(cn => cn.CreatedAt)
            .ToListAsync(cancellationToken);

        return creditNotes.Select(MapToDto).ToList();
    }

    public async Task<CreditNoteDto> GetAsync(
        Guid userId,
        Guid businessId,
        Guid creditNoteId,
        CancellationToken cancellationToken)
    {
        var business = await dbContext.Businesses
            .FirstOrDefaultAsync(b => b.Id == businessId && b.UserId == userId, cancellationToken);

        if (business == null)
            throw new InvalidOperationException("Business not found or access denied.");

        var creditNote = await dbContext.CreditNotes
            .FirstOrDefaultAsync(cn => cn.Id == creditNoteId && cn.BusinessId == businessId && !cn.IsDeleted, cancellationToken);

        if (creditNote == null)
            throw new InvalidOperationException("Credit note not found.");

        return MapToDto(creditNote);
    }

    public async Task DeleteAsync(
        Guid userId,
        Guid businessId,
        Guid creditNoteId,
        CancellationToken cancellationToken)
    {
        var business = await dbContext.Businesses
            .FirstOrDefaultAsync(b => b.Id == businessId && b.UserId == userId, cancellationToken);

        if (business == null)
            throw new InvalidOperationException("Business not found or access denied.");

        var creditNote = await dbContext.CreditNotes
            .FirstOrDefaultAsync(cn => cn.Id == creditNoteId && cn.BusinessId == businessId && !cn.IsDeleted, cancellationToken);

        if (creditNote == null)
            throw new InvalidOperationException("Credit note not found.");

        creditNote.IsDeleted = true;
        creditNote.DeletedAt = DateTimeOffset.UtcNow;
        creditNote.UpdatedAt = DateTimeOffset.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task<string> GenerateNextCreditNoteNumberAsync(
        ApplicationDbContext dbContext,
        Business business,
        CancellationToken cancellationToken)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var prefix = $"CN-{business.Id:N}{today.ToString("yyyyMMdd", CultureInfo.InvariantCulture)}";

        // Read the sequence back from the numbers already issued, including soft-deleted ones,
        // rather than counting live rows: a count that filters out IsDeleted hands the next credit
        // note a number a deleted one already used, so one accounting number would point at two
        // documents. Backed by the unique (business_id, credit_note_number) index so a genuine
        // concurrent collision fails loudly instead of duplicating (IG-234).
        var issued = await dbContext.CreditNotes
            .Where(cn => cn.BusinessId == business.Id && cn.CreditNoteNumber.StartsWith(prefix))
            .Select(cn => cn.CreditNoteNumber)
            .ToListAsync(cancellationToken);

        var nextSequence = issued
            .Select(number => int.TryParse(number[prefix.Length..], NumberStyles.None, CultureInfo.InvariantCulture, out var sequence) ? sequence : 0)
            .DefaultIfEmpty(0)
            .Max() + 1;

        return $"{prefix}{nextSequence:D4}";
    }

    private static CreditNoteDto MapToDto(CreditNote creditNote)
    {
        return new CreditNoteDto(
            creditNote.Id,
            creditNote.InvoiceId,
            creditNote.CustomerId,
            creditNote.CreditNoteNumber,
            creditNote.IssueDate,
            creditNote.Reason,
            creditNote.Currency,
            creditNote.Amount,
            creditNote.Notes,
            creditNote.CreatedAt);
    }
}
