using InvoiceApp.Application.Exceptions;
using InvoiceApp.Application.Reporting;
using InvoiceApp.Domain.Invoicing;
using InvoiceApp.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace InvoiceApp.Infrastructure.Reporting;

public sealed class ReportingService(ApplicationDbContext dbContext) : IReportingService
{
    public async Task<RevenueReportDto> GetRevenueReportAsync(
        Guid userId,
        string periodType,
        DateOnly? startDate,
        DateOnly? endDate,
        CancellationToken cancellationToken)
    {
        var business = await dbContext.Businesses
            .AsNoTracking()
            .SingleOrDefaultAsync(b => b.UserId == userId, cancellationToken)
            ?? throw new NotFoundException("No business found for user.");

        var now = DateOnly.FromDateTime(DateTime.UtcNow);
        var effectiveStart = startDate ?? new DateOnly(now.Year, now.Month, 1);
        var effectiveEnd = endDate ?? now;

        // IG-313: cash basis - a payment is revenue in the period it was RECEIVED, so both the
        // range filter and the period grouping key come from Payment.PaymentDate, never from the
        // invoice's IssueDate. Filtering on the payment date before the join keeps the predicate
        // on a real column (Engineering Note 46). The join to Invoices is what scopes the figures
        // to this business, its default currency and non-deleted invoices - payments carry no
        // business id of their own.
        var payments = await dbContext.Payments
            .AsNoTracking()
            .Where(p => p.PaymentDate >= effectiveStart && p.PaymentDate <= effectiveEnd)
            .Join(
                dbContext.Invoices
                    .Where(i => i.BusinessId == business.Id
                        && i.Currency == business.DefaultCurrency
                        && !i.IsDeleted),
                payment => payment.InvoiceId,
                invoice => invoice.Id,
                (payment, invoice) => new { payment.PaymentDate, payment.Amount })
            .ToListAsync(cancellationToken);

        var revenueByPeriod = payments
            .GroupBy(p => GetPeriodKey(p.PaymentDate, periodType))
            .ToDictionary(g => g.Key, g => g.Sum(x => x.Amount));

        var periods = GenerateAllPeriods(effectiveStart, effectiveEnd, periodType)
            .Select(period => new RevenuePeriodDto(period, revenueByPeriod.TryGetValue(period, out var revenue) ? revenue : 0m))
            .ToList();

        return new RevenueReportDto(business.DefaultCurrency, periodType, periods);
    }

    private static string GetPeriodKey(DateOnly date, string periodType) => periodType.ToLower() switch
    {
        "month" => $"{date.Year}-{date.Month:D2}",
        "quarter" => $"{date.Year}-Q{(date.Month - 1) / 3 + 1}",
        "year" => $"{date.Year}",
        _ => throw new ArgumentException($"Invalid period type: {periodType}")
    };

    private static List<string> GenerateAllPeriods(DateOnly start, DateOnly end, string periodType)
    {
        var periods = new List<string>();
        return periodType.ToLower() switch
        {
            "month" => GenerateMonthPeriods(start, end),
            "quarter" => GenerateQuarterPeriods(start, end),
            "year" => GenerateYearPeriods(start, end),
            _ => periods
        };
    }

    private static List<string> GenerateMonthPeriods(DateOnly start, DateOnly end)
    {
        var periods = new List<string>();
        var current = new DateOnly(start.Year, start.Month, 1);
        while (current <= end)
        {
            periods.Add($"{current.Year}-{current.Month:D2}");
            current = current.AddMonths(1);
        }
        return periods;
    }

    private static List<string> GenerateQuarterPeriods(DateOnly start, DateOnly end)
    {
        var periods = new List<string>();
        var quarter = (start.Month - 1) / 3 + 1;
        var current = start.Year;

        while (current < end.Year || (current == end.Year && quarter <= (end.Month - 1) / 3 + 1))
        {
            periods.Add($"{current}-Q{quarter}");
            quarter++;
            if (quarter > 4)
            {
                quarter = 1;
                current++;
            }
        }
        return periods;
    }

    private static List<string> GenerateYearPeriods(DateOnly start, DateOnly end)
    {
        var periods = new List<string>();
        for (int year = start.Year; year <= end.Year; year++)
        {
            periods.Add($"{year}");
        }
        return periods;
    }

    public async Task<List<OutstandingInvoiceDto>> GetOutstandingReportAsync(
        Guid userId,
        CancellationToken cancellationToken)
    {
        var business = await dbContext.Businesses
            .AsNoTracking()
            .SingleOrDefaultAsync(b => b.UserId == userId, cancellationToken)
            ?? throw new NotFoundException("No business found for user.");

        var invoices = await dbContext.Invoices
            .AsNoTracking()
            .Where(i => i.BusinessId == business.Id && !i.IsDeleted)
            .Where(i => i.Status != InvoiceStatus.Cancelled && i.AmountDue > 0)
            // IG-275: order on the invoice's real due_date column BEFORE projecting into the
            // DTO. Sorting after a client projection does not translate - PostgreSQL threw
            // "The LINQ expression 'DbSet<Invoice>()' could not be translated" and this endpoint
            // returned 500 for every caller, while EF Core InMemory evaluated it happily and the
            // test suite stayed green. Engineering Note 46, and the reason the four-command gate
            // is not sufficient on its own for a query change.
            .Join(
                dbContext.Customers,
                invoice => invoice.CustomerId,
                customer => customer.Id,
                (invoice, customer) => new { Invoice = invoice, Customer = customer })
            .OrderByDescending(x => x.Invoice.DueDate)
            .Select(x => new OutstandingInvoiceDto(
                x.Invoice.Id,
                x.Invoice.InvoiceNumber,
                x.Customer.BusinessName ?? x.Customer.ContactName ?? string.Empty,
                x.Invoice.IssueDate,
                x.Invoice.DueDate,
                x.Invoice.Currency,
                x.Invoice.AmountDue,
                x.Invoice.Status.ToString()))
            .ToListAsync(cancellationToken);

        return invoices;
    }

    public async Task<List<OverdueInvoiceDto>> GetOverdueReportAsync(
        Guid userId,
        CancellationToken cancellationToken)
    {
        var business = await dbContext.Businesses
            .AsNoTracking()
            .SingleOrDefaultAsync(b => b.UserId == userId, cancellationToken)
            ?? throw new NotFoundException("No business found for user.");

        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var invoices = await dbContext.Invoices
            .AsNoTracking()
            .Where(i => i.BusinessId == business.Id && !i.IsDeleted)
            .Where(i => i.Status != InvoiceStatus.Cancelled && i.AmountDue > 0 && i.DueDate < today)
            // IG-275: order on the invoice's real due_date column BEFORE projecting into the
            // DTO. Sorting after a client projection does not translate - PostgreSQL threw
            // "The LINQ expression 'DbSet<Invoice>()' could not be translated" and this endpoint
            // returned 500 for every caller, while EF Core InMemory evaluated it happily and the
            // test suite stayed green. Engineering Note 46, and the reason the four-command gate
            // is not sufficient on its own for a query change.
            .Join(
                dbContext.Customers,
                invoice => invoice.CustomerId,
                customer => customer.Id,
                (invoice, customer) => new { Invoice = invoice, Customer = customer })
            .OrderByDescending(x => x.Invoice.DueDate)
            .Select(x => new OverdueInvoiceDto(
                x.Invoice.Id,
                x.Invoice.InvoiceNumber,
                x.Customer.BusinessName ?? x.Customer.ContactName ?? string.Empty,
                x.Invoice.IssueDate,
                x.Invoice.DueDate,
                x.Invoice.Currency,
                x.Invoice.AmountDue,
                x.Invoice.Status.ToString()))
            .ToListAsync(cancellationToken);

        return invoices;
    }

    public async Task<List<RevenueByCustomerDto>> GetRevenueByCustomerAsync(
        Guid userId,
        DateOnly? startDate,
        DateOnly? endDate,
        CancellationToken cancellationToken)
    {
        var business = await dbContext.Businesses
            .AsNoTracking()
            .SingleOrDefaultAsync(b => b.UserId == userId, cancellationToken)
            ?? throw new NotFoundException("No business found for user.");

        var now = DateOnly.FromDateTime(DateTime.UtcNow);
        var effectiveStart = startDate ?? new DateOnly(now.Year, now.Month, 1);
        var effectiveEnd = endDate ?? now;

        // Get all customers for the business
        var customers = await dbContext.Customers
            .AsNoTracking()
            .Where(c => c.BusinessId == business.Id && !c.IsArchived)
            .Select(c => new { c.Id, c.BusinessName, c.ContactName })
            .ToListAsync(cancellationToken);

        // IG-313: cash basis, the same as GetRevenueReportAsync - the period is filtered on when
        // each payment was received, not on when the invoice was issued. Keeping the two methods
        // on one basis is the point of IG-313: a customer's revenue has to add up to the revenue
        // report over the same range, and before this it did not.
        // IG-275: grouped in memory rather than with a translated GroupBy. The previous
        // GroupBy(...).ToDictionaryAsync(...) runs on PostgreSQL but EF Core's InMemory provider
        // cannot translate it ("The LINQ expression 'DbSet<Payment>()' could not be translated"),
        // so no endpoint test could ever exercise this method - which is how the IG-313 change to
        // it went unverified by the suite and had to be checked by hand against real Postgres.
        // The row count here is one per payment in the range for one business, so materialising
        // before grouping is not a concern at this scale.
        var paymentsInRange = await dbContext.Payments
            .AsNoTracking()
            .Where(p => p.PaymentDate >= effectiveStart && p.PaymentDate <= effectiveEnd)
            .Join(
                dbContext.Invoices
                    .Where(i => i.BusinessId == business.Id
                        && !i.IsDeleted
                        && i.Currency == business.DefaultCurrency),
                payment => payment.InvoiceId,
                invoice => invoice.Id,
                (payment, invoice) => new { invoice.CustomerId, payment.Amount })
            .ToListAsync(cancellationToken);

        var revenueByCustomer = paymentsInRange
            .GroupBy(x => x.CustomerId)
            .ToDictionary(g => g.Key, g => g.Sum(x => x.Amount));

        // Build result including customers with zero revenue
        var result = customers
            .Select(c => new RevenueByCustomerDto(
                c.Id,
                c.BusinessName ?? c.ContactName ?? string.Empty,
                business.DefaultCurrency,
                revenueByCustomer.TryGetValue(c.Id, out var revenue) ? revenue : 0m))
            .OrderByDescending(x => x.Revenue)
            .ThenBy(x => x.CustomerName)
            .ToList();

        return result;
    }

    public async Task<TaxSummaryDto> GetTaxSummaryAsync(
        Guid userId,
        DateOnly? startDate,
        DateOnly? endDate,
        CancellationToken cancellationToken)
    {
        var business = await dbContext.Businesses
            .AsNoTracking()
            .SingleOrDefaultAsync(b => b.UserId == userId, cancellationToken)
            ?? throw new NotFoundException("No business found for user.");

        var now = DateOnly.FromDateTime(DateTime.UtcNow);
        var effectiveStart = startDate ?? new DateOnly(now.Year, now.Month, 1);
        var effectiveEnd = endDate ?? now;

        // IG-314: a cancelled invoice is not a taxable supply, and this figure is what a user
        // transcribes onto a BAS or VAT return - counting voided sales overstates the tax they
        // owe. Before this the query selected i.Status and then never read it, so every invoice in
        // the range contributed its tax regardless of status.
        //
        // Draft is deliberately NOT excluded, though a never-issued invoice plainly is not a
        // taxable supply either. Nothing in this codebase ever assigns InvoiceStatus.Sent or
        // Viewed, and Invoice has no SentAt column, so a saved-but-unpaid invoice sits at Draft
        // whether or not it was emailed to the customer. Draft therefore means "unpaid", not "not
        // issued", and filtering it out would drop real taxable supplies - under-reporting tax
        // instead of over-reporting it. Fixing that half needs a stored "issued" signal, which is
        // a data-model change rather than a query change. See docs/FSD.md section 142.
        var invoices = await dbContext.Invoices
            .AsNoTracking()
            .Where(i => i.BusinessId == business.Id && !i.IsDeleted && i.Currency == business.DefaultCurrency)
            .Where(i => i.Status != InvoiceStatus.Cancelled)
            .Where(i => i.IssueDate >= effectiveStart && i.IssueDate <= effectiveEnd)
            .Select(i => new
            {
                i.TaxAmount,
                i.Subtotal,
                i.DiscountAmount
            })
            .ToListAsync(cancellationToken);

        // Calculate taxable amount (subtotal - discount) for each invoice
        var taxableAmountPerInvoice = invoices
            .Select(i => new
            {
                TaxableAmount = i.Subtotal - i.DiscountAmount,
                i.TaxAmount
            })
            .ToList();

        var totalTaxable = taxableAmountPerInvoice.Sum(x => x.TaxableAmount);
        var totalTaxCollected = invoices.Sum(i => i.TaxAmount);

        // Group taxes by rate (simplified: group by whether tax exists)
        // Since the invoices don't store tax rate explicitly, we aggregate by the tax collected
        var taxesByRate = new List<TaxByRateDto>();

        if (totalTaxCollected > 0 && totalTaxable > 0)
        {
            // Calculate average tax rate from total
            var avgTaxRate = (totalTaxCollected / totalTaxable) * 100m;
            taxesByRate.Add(new TaxByRateDto(
                Math.Round(avgTaxRate, 2),
                totalTaxable,
                totalTaxCollected));
        }

        return new TaxSummaryDto(
            business.DefaultCurrency,
            totalTaxable,
            totalTaxCollected,
            taxesByRate);
    }
}
