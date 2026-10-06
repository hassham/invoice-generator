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
        var countToday = await dbContext.CreditNotes
            .CountAsync(cn => cn.BusinessId == business.Id &&
                             cn.IssueDate == today &&
                             !cn.IsDeleted,
                         cancellationToken);

        return $"CN-{business.Id:N}{today:yyyyMMdd}{countToday + 1:D4}";
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
