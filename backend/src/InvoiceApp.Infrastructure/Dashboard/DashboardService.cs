using InvoiceApp.Application.Dashboard;
using InvoiceApp.Application.Invoicing;
using InvoiceApp.Domain.Invoicing;
using InvoiceApp.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace InvoiceApp.Infrastructure.Dashboard;

public sealed class DashboardService(ApplicationDbContext dbContext) : IDashboardService
{
    private const int RecentInvoiceCount = 5;

    public async Task<DashboardSummaryDto> GetSummaryAsync(Guid userId, DateOnly? startDate, DateOnly? endDate, CancellationToken cancellationToken)
    {
        var business = await dbContext.Businesses.SingleAsync(b => b.UserId == userId, cancellationToken);
        var businessId = business.Id;

        var today = DateOnly.FromDateTime(DateTimeOffset.UtcNow.Date);
        var periodStart = startDate ?? new DateOnly(today.Year, today.Month, 1);
        var periodEnd = endDate ?? periodStart.AddMonths(1).AddDays(-1);

        // FSD section 109 defines these against "invoices" without addressing multi-currency
        // accounts - scoped to the business's current default currency so the totals are
        // additions of like units, not a meaningless cross-currency sum (see DashboardSummaryDto's
        // doc comment).
        var scoped = dbContext.Invoices.Where(invoice => invoice.BusinessId == businessId && !invoice.IsDeleted && invoice.Currency == business.DefaultCurrency);

        // "Sum invoice totals excluding Draft, Cancelled" - period-scoped by issue date (FSD
        // section 42's "financial summary ... period").
        var totalInvoiced = await scoped
            .Where(invoice => invoice.Status != InvoiceStatus.Draft && invoice.Status != InvoiceStatus.Cancelled)
            .Where(invoice => invoice.IssueDate >= periodStart && invoice.IssueDate <= periodEnd)
            .SumAsync(invoice => (decimal?)invoice.TotalAmount, cancellationToken) ?? 0m;

        // Always 0 today - no payment recording exists yet (Epic IG-11), so amount_paid never
        // moves off its default. The query is still correct and will reflect real figures once
        // that Epic lands; excluding Cancelled here for the same reason as above, even though it
        // has no observable effect until then.
        var totalPaid = await scoped
            .Where(invoice => invoice.Status != InvoiceStatus.Cancelled)
            .Where(invoice => invoice.IssueDate >= periodStart && invoice.IssueDate <= periodEnd)
            .SumAsync(invoice => (decimal?)invoice.AmountPaid, cancellationToken) ?? 0m;

        // "Sum Amount Due for valid unpaid invoices" - FSD doesn't exclude Draft here (unlike
        // Total Invoiced's explicit exclusion list), so a Draft's own Amount Due still counts as
        // outstanding; only Cancelled (void, nothing owed) is excluded. Deliberately NOT
        // period-scoped - this is a current balance, not activity during a period.
        var outstanding = await scoped
            .Where(invoice => invoice.Status != InvoiceStatus.Cancelled && invoice.AmountDue > 0)
            .SumAsync(invoice => (decimal?)invoice.AmountDue, cancellationToken) ?? 0m;

        // "Sum Amount Due where DueDate < CurrentDate and AmountDue > 0" - same Cancelled
        // exclusion and same "not period-scoped" reasoning as Outstanding above.
        var overdue = await scoped
            .Where(invoice => invoice.Status != InvoiceStatus.Cancelled && invoice.DueDate < today && invoice.AmountDue > 0)
            .SumAsync(invoice => (decimal?)invoice.AmountDue, cancellationToken) ?? 0m;

        // FSD section 43: "Display latest invoices" - no explicit count given, 5 is a
        // deliberate, small dashboard-widget default (the full history has its own page, IG-62).
        // Not currency-scoped - each row already displays its own currency. Status mirrors
        // InvoiceStatusRules.DetermineEffectiveStatus (IG-50) - inlined rather than called, since
        // EF Core can't translate an arbitrary method call into SQL.
        var recentInvoices = await dbContext.Invoices
            .Where(invoice => invoice.BusinessId == businessId && !invoice.IsDeleted)
            .OrderByDescending(invoice => invoice.CreatedAt)
            .Take(RecentInvoiceCount)
            .Join(
                dbContext.Customers,
                invoice => invoice.CustomerId,
                customer => customer.Id,
                (invoice, customer) => new InvoiceListItemDto(
                    invoice.Id,
                    invoice.InvoiceNumber,
                    customer.BusinessName ?? customer.ContactName ?? string.Empty,
                    invoice.Status != InvoiceStatus.Paid && invoice.Status != InvoiceStatus.Cancelled
                        && invoice.DueDate < today && invoice.AmountDue > 0
                            ? InvoiceStatus.Overdue
                            : invoice.Status,
                    invoice.IssueDate,
                    invoice.DueDate,
                    invoice.Currency,
                    invoice.TotalAmount,
                    invoice.AmountDue))
            .ToListAsync(cancellationToken);

        return new DashboardSummaryDto(totalInvoiced, totalPaid, outstanding, overdue, business.DefaultCurrency, recentInvoices);
    }
}
