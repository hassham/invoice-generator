using Microsoft.EntityFrameworkCore;
using InvoiceApp.Application.Payments;
using InvoiceApp.Domain.Businesses;
using InvoiceApp.Domain.Invoicing;
using InvoiceApp.Domain.Payments;
using InvoiceApp.Infrastructure.Persistence;

namespace InvoiceApp.Infrastructure.Payments;

public sealed class ReceiptService(ApplicationDbContext dbContext) : IReceiptService
{
    public async Task<ReceiptDto> CreateAsync(
        Guid userId,
        Guid businessId,
        CreateReceiptCommand command,
        CancellationToken cancellationToken)
    {
        var business = await dbContext.Businesses.FindAsync([businessId], cancellationToken)
            ?? throw new InvalidOperationException("Business not found.");

        if (business.UserId != userId)
            throw new InvalidOperationException("Access denied.");

        var payment = await dbContext.Payments.FindAsync([command.PaymentId], cancellationToken)
            ?? throw new InvalidOperationException("Payment not found.");

        var invoice = await dbContext.Invoices.FindAsync([payment.InvoiceId], cancellationToken)
            ?? throw new InvalidOperationException("Invoice not found.");

        if (invoice.BusinessId != businessId)
            throw new InvalidOperationException("Payment does not belong to this business.");

        var issueDate = DateOnly.FromDateTime(DateTime.Now);
        var sequenceNumber = await dbContext.Receipts
            .Where(r => r.BusinessId == businessId && r.IssueDate == issueDate)
            .CountAsync(cancellationToken) + 1;

        var receiptNumber = $"R-{businessId:N}".Substring(0, 9) + $"{issueDate:yyyyMMdd}{sequenceNumber:D3}";

        var receipt = new Receipt
        {
            Id = Guid.NewGuid(),
            PaymentId = payment.Id,
            InvoiceId = invoice.Id,
            BusinessId = businessId,
            ReceiptNumber = receiptNumber,
            IssueDate = issueDate,
            CreatedAt = DateTimeOffset.UtcNow,
            Amount = payment.Amount,
            PaymentDate = payment.PaymentDate,
            PaymentMethod = payment.PaymentMethod,
            PaymentReference = payment.Reference,
            InvoiceNumber = invoice.InvoiceNumber,
            Currency = invoice.Currency,
            BusinessName = business.BusinessName,
            BusinessEmail = business.Email,
        };

        dbContext.Receipts.Add(receipt);
        await dbContext.SaveChangesAsync(cancellationToken);

        return MapToDto(receipt);
    }

    public async Task<List<ReceiptDto>> ListByInvoiceAsync(
        Guid userId,
        Guid businessId,
        Guid invoiceId,
        CancellationToken cancellationToken)
    {
        var invoice = await dbContext.Invoices.FindAsync([invoiceId], cancellationToken)
            ?? throw new InvalidOperationException("Invoice not found.");

        if (invoice.BusinessId != businessId)
            throw new InvalidOperationException("Access denied.");

        var business = await dbContext.Businesses.FindAsync([businessId], cancellationToken)
            ?? throw new InvalidOperationException("Business not found.");

        if (business.UserId != userId)
            throw new InvalidOperationException("Access denied.");

        var receipts = await dbContext.Receipts
            .Where(r => r.InvoiceId == invoiceId && r.BusinessId == businessId)
            .OrderByDescending(r => r.IssueDate)
            .ToListAsync(cancellationToken);

        return receipts.Select(MapToDto).ToList();
    }

    public async Task<List<ReceiptDto>> ListByBusinessAsync(
        Guid userId,
        Guid businessId,
        CancellationToken cancellationToken)
    {
        var business = await dbContext.Businesses.FindAsync([businessId], cancellationToken)
            ?? throw new InvalidOperationException("Business not found.");

        if (business.UserId != userId)
            throw new InvalidOperationException("Access denied.");

        var receipts = await dbContext.Receipts
            .Where(r => r.BusinessId == businessId)
            .OrderByDescending(r => r.IssueDate)
            .ToListAsync(cancellationToken);

        return receipts.Select(MapToDto).ToList();
    }

    public async Task<ReceiptDto> GetAsync(
        Guid userId,
        Guid businessId,
        Guid receiptId,
        CancellationToken cancellationToken)
    {
        var receipt = await dbContext.Receipts.FindAsync([receiptId], cancellationToken)
            ?? throw new InvalidOperationException("Receipt not found.");

        if (receipt.BusinessId != businessId)
            throw new InvalidOperationException("Access denied.");

        var business = await dbContext.Businesses.FindAsync([businessId], cancellationToken)
            ?? throw new InvalidOperationException("Business not found.");

        if (business.UserId != userId)
            throw new InvalidOperationException("Access denied.");

        return MapToDto(receipt);
    }

    public async Task DeleteAsync(
        Guid userId,
        Guid businessId,
        Guid receiptId,
        CancellationToken cancellationToken)
    {
        var receipt = await dbContext.Receipts.FindAsync([receiptId], cancellationToken)
            ?? throw new InvalidOperationException("Receipt not found.");

        if (receipt.BusinessId != businessId)
            throw new InvalidOperationException("Access denied.");

        var business = await dbContext.Businesses.FindAsync([businessId], cancellationToken)
            ?? throw new InvalidOperationException("Business not found.");

        if (business.UserId != userId)
            throw new InvalidOperationException("Access denied.");

        dbContext.Receipts.Remove(receipt);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private static ReceiptDto MapToDto(Receipt receipt) => new(
        receipt.Id,
        receipt.PaymentId,
        receipt.InvoiceId,
        receipt.ReceiptNumber,
        receipt.IssueDate,
        receipt.Amount,
        receipt.PaymentDate,
        receipt.PaymentMethod,
        receipt.Currency,
        receipt.CreatedAt,
        receipt.InvoiceNumber,
        receipt.BusinessName,
        receipt.BusinessEmail
    );
}
