using InvoiceApp.Application.Documents;
using InvoiceApp.Domain.Estimates;
using InvoiceApp.Domain.Invoicing;
using InvoiceApp.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace InvoiceApp.Infrastructure.Documents;

/// <summary>
/// IG-237: the unified document list. Five document types live in five tables with five different
/// shapes; each is filtered in its own query and projected into one common row, and the combined
/// set is then ordered, counted and paged. Only the types actually asked for are queried, so
/// filtering by type removes work rather than just hiding rows.
///
/// Ordering is by issue date, the only date all five types share - the invoice-only list (IG-62)
/// sorts by CreatedAt, which does not mean the same thing across these tables.
///
/// Two EF Core constraints shape this code, both of which cost a round of real-database debugging
/// and neither of which the InMemory provider reproduces:
///
/// 1. The union cannot happen in SQL. EF refuses a set operation applied after a projection
///    ("Unable to translate set operation after client projection has been applied"), and there is
///    no shared entity type to Concat before projecting. So the merge, sort, count and page happen
///    in memory, over rows the database has already filtered.
/// 2. Nothing may filter on the projected row. A Where over the projection's own properties is
///    likewise untranslatable, so search and the date range are applied inside each type's query,
///    against real columns.
///
/// The cost of (1) is that a request loads every matching document for the business, not just the
/// requested page. That is fine at this product's scale - small businesses, hundreds of documents -
/// but it is a real ceiling: if one account ever holds tens of thousands, this needs to become a
/// database view or a raw UNION ALL that can be paged in SQL.
/// </summary>
public sealed class DocumentListService(ApplicationDbContext dbContext) : IDocumentListService
{
    /// <summary>
    /// The shape every document collapses into.
    ///
    /// The two status enums get a field each rather than sharing one, because both are persisted
    /// with <c>HasConversion&lt;string&gt;()</c> - the column holds "Draft", not 0. Projecting
    /// either as a shared integer makes Postgres try to cast that text to an integer and the query
    /// dies with <c>22P02: invalid input syntax for type integer: "Draft"</c>, which InMemory
    /// reports as a pass (the same lesson as Engineering Note 23).
    /// </summary>
    private sealed record Row(
        Guid Id,
        DocumentType DocumentType,
        string DocumentNumber,
        string PartyName,
        DateOnly IssueDate,
        string Currency,
        decimal TotalAmount,
        InvoiceStatus? InvoiceStatus,
        EstimateStatus? EstimateStatus,
        bool IsOverdue);

    public async Task<DocumentListResponse> ListAsync(Guid userId, DocumentListQuery query, CancellationToken cancellationToken)
    {
        var businessId = await dbContext.Businesses
            .Where(business => business.UserId == userId)
            .Select(business => business.Id)
            .SingleAsync(cancellationToken);

        // Same bounds as the invoice list (FSD section 112): default 25, hard ceiling 100, and an
        // out-of-range value falls back to the default rather than erroring.
        var pageSize = query.PageSize is >= 1 and <= 100 ? query.PageSize : 25;
        var page = query.Page < 1 ? 1 : query.Page;
        var today = DateOnly.FromDateTime(DateTimeOffset.UtcNow.Date);

        var term = string.IsNullOrWhiteSpace(query.Search) ? null : query.Search.Trim().ToLower();
        var startDate = query.StartDate;
        var endDate = query.EndDate;

        var sources = new List<IQueryable<Row>>();

        if (Wanted(query, DocumentType.Invoice))
        {
            sources.Add(
                from invoice in dbContext.Invoices
                join customer in dbContext.Customers on invoice.CustomerId equals customer.Id
                where invoice.BusinessId == businessId && !invoice.IsDeleted
                    && (term == null
                        || invoice.InvoiceNumber.ToLower().Contains(term)
                        || (customer.BusinessName != null && customer.BusinessName.ToLower().Contains(term))
                        || (customer.ContactName != null && customer.ContactName.ToLower().Contains(term)))
                    && (startDate == null || invoice.IssueDate >= startDate)
                    && (endDate == null || invoice.IssueDate <= endDate)
                select new Row(
                    invoice.Id,
                    DocumentType.Invoice,
                    invoice.InvoiceNumber,
                    customer.BusinessName ?? customer.ContactName ?? string.Empty,
                    invoice.IssueDate,
                    invoice.Currency,
                    invoice.TotalAmount,
                    invoice.Status,
                    null,
                    // Mirrors InvoiceStatusRules.DetermineEffectiveStatus (IG-50), inlined because
                    // EF cannot translate the method call - the list must show Overdue the same way
                    // the invoice-only list does.
                    invoice.Status != InvoiceStatus.Paid && invoice.Status != InvoiceStatus.Cancelled
                        && invoice.DueDate < today && invoice.AmountDue > 0));
        }

        if (Wanted(query, DocumentType.Estimate))
        {
            sources.Add(
                from estimate in dbContext.Estimates
                join customer in dbContext.Customers on estimate.CustomerId equals customer.Id
                where estimate.BusinessId == businessId && !estimate.IsDeleted
                    && (term == null
                        || estimate.EstimateNumber.ToLower().Contains(term)
                        || (customer.BusinessName != null && customer.BusinessName.ToLower().Contains(term))
                        || (customer.ContactName != null && customer.ContactName.ToLower().Contains(term)))
                    && (startDate == null || estimate.IssueDate >= startDate)
                    && (endDate == null || estimate.IssueDate <= endDate)
                select new Row(
                    estimate.Id,
                    DocumentType.Estimate,
                    estimate.EstimateNumber,
                    customer.BusinessName ?? customer.ContactName ?? string.Empty,
                    estimate.IssueDate,
                    estimate.Currency,
                    estimate.TotalAmount,
                    null,
                    estimate.Status,
                    false));
        }

        if (Wanted(query, DocumentType.CreditNote))
        {
            sources.Add(
                from creditNote in dbContext.CreditNotes
                join customer in dbContext.Customers on creditNote.CustomerId equals customer.Id
                where creditNote.BusinessId == businessId && !creditNote.IsDeleted
                    && (term == null
                        || creditNote.CreditNoteNumber.ToLower().Contains(term)
                        || (customer.BusinessName != null && customer.BusinessName.ToLower().Contains(term))
                        || (customer.ContactName != null && customer.ContactName.ToLower().Contains(term)))
                    && (startDate == null || creditNote.IssueDate >= startDate)
                    && (endDate == null || creditNote.IssueDate <= endDate)
                select new Row(
                    creditNote.Id,
                    DocumentType.CreditNote,
                    creditNote.CreditNoteNumber,
                    customer.BusinessName ?? customer.ContactName ?? string.Empty,
                    creditNote.IssueDate,
                    creditNote.Currency,
                    creditNote.Amount,
                    null,
                    null,
                    false));
        }

        if (Wanted(query, DocumentType.Receipt))
        {
            // A receipt carries no customer of its own - it is reached through the invoice it was
            // issued against. Receipts are hard-deleted, so there is no IsDeleted to filter, but a
            // receipt whose invoice was soft-deleted is excluded with it.
            sources.Add(
                from receipt in dbContext.Receipts
                join invoice in dbContext.Invoices on receipt.InvoiceId equals invoice.Id
                join customer in dbContext.Customers on invoice.CustomerId equals customer.Id
                where receipt.BusinessId == businessId && !invoice.IsDeleted
                    && (term == null
                        || receipt.ReceiptNumber.ToLower().Contains(term)
                        || (customer.BusinessName != null && customer.BusinessName.ToLower().Contains(term))
                        || (customer.ContactName != null && customer.ContactName.ToLower().Contains(term)))
                    && (startDate == null || receipt.IssueDate >= startDate)
                    && (endDate == null || receipt.IssueDate <= endDate)
                select new Row(
                    receipt.Id,
                    DocumentType.Receipt,
                    receipt.ReceiptNumber,
                    customer.BusinessName ?? customer.ContactName ?? string.Empty,
                    receipt.IssueDate,
                    receipt.Currency,
                    receipt.Amount,
                    null,
                    null,
                    false));
        }

        if (Wanted(query, DocumentType.PurchaseOrder))
        {
            // The counterparty is a supplier, not a customer, though both are Customer rows
            // (IG-236). The list column is labelled neutrally for exactly this reason.
            sources.Add(
                from purchaseOrder in dbContext.PurchaseOrders
                join supplier in dbContext.Customers on purchaseOrder.SupplierId equals supplier.Id
                where purchaseOrder.BusinessId == businessId && !purchaseOrder.IsDeleted
                    && (term == null
                        || purchaseOrder.PONumber.ToLower().Contains(term)
                        || (supplier.BusinessName != null && supplier.BusinessName.ToLower().Contains(term))
                        || (supplier.ContactName != null && supplier.ContactName.ToLower().Contains(term)))
                    && (startDate == null || purchaseOrder.IssueDate >= startDate)
                    && (endDate == null || purchaseOrder.IssueDate <= endDate)
                select new Row(
                    purchaseOrder.Id,
                    DocumentType.PurchaseOrder,
                    purchaseOrder.PONumber,
                    supplier.BusinessName ?? supplier.ContactName ?? string.Empty,
                    purchaseOrder.IssueDate,
                    purchaseOrder.Currency,
                    purchaseOrder.TotalAmount,
                    null,
                    null,
                    false));
        }

        if (sources.Count == 0)
        {
            return new DocumentListResponse([], page, pageSize, 0);
        }

        var matched = new List<Row>();
        foreach (var source in sources)
        {
            matched.AddRange(await source.ToListAsync(cancellationToken));
        }

        var ordered = query.Sort switch
        {
            DocumentSortOption.Oldest => matched.OrderBy(row => row.IssueDate).ThenBy(row => row.DocumentNumber, StringComparer.Ordinal),
            DocumentSortOption.AmountHighest => matched.OrderByDescending(row => row.TotalAmount).ThenBy(row => row.DocumentNumber, StringComparer.Ordinal),
            DocumentSortOption.AmountLowest => matched.OrderBy(row => row.TotalAmount).ThenBy(row => row.DocumentNumber, StringComparer.Ordinal),
            // Newest, the default. The secondary key keeps paging stable when many documents share
            // an issue date, which is common - a page boundary inside an unordered tie can
            // otherwise drop or repeat a row between page 1 and page 2.
            _ => matched.OrderByDescending(row => row.IssueDate).ThenByDescending(row => row.DocumentNumber, StringComparer.Ordinal),
        };

        var items = ordered
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(row => new DocumentSummaryDto(
                row.Id,
                row.DocumentType,
                row.DocumentNumber,
                row.PartyName,
                row.IssueDate,
                row.Currency,
                row.TotalAmount,
                DescribeStatus(row)))
            .ToList();

        return new DocumentListResponse(items, page, pageSize, matched.Count);
    }

    private static bool Wanted(DocumentListQuery query, DocumentType type) =>
        query.DocumentType is null || query.DocumentType == type;

    /// <summary>Credit notes, receipts and purchase orders have no lifecycle of their own, so they
    /// report no status rather than a made-up one.</summary>
    private static string? DescribeStatus(Row row) => row switch
    {
        { IsOverdue: true } => InvoiceStatus.Overdue.ToString(),
        { InvoiceStatus: { } status } => status.ToString(),
        { EstimateStatus: { } status } => status.ToString(),
        _ => null,
    };
}
