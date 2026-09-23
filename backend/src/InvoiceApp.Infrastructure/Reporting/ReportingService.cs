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

        var invoices = await dbContext.Invoices
            .AsNoTracking()
            .Where(i => i.BusinessId == business.Id && i.Currency == business.DefaultCurrency && !i.IsDeleted)
            .Where(i => i.IssueDate >= effectiveStart && i.IssueDate <= effectiveEnd)
            .Select(i => i.Id)
            .ToListAsync(cancellationToken);

        var payments = await dbContext.Payments
            .AsNoTracking()
            .Where(p => invoices.Contains(p.InvoiceId))
            .ToListAsync(cancellationToken);

        var invoiceDateMap = await dbContext.Invoices
            .AsNoTracking()
            .Where(i => invoices.Contains(i.Id))
            .Select(i => new { i.Id, i.IssueDate })
            .ToDictionaryAsync(x => x.Id, x => x.IssueDate, cancellationToken);

        var revenueByPeriod = payments
            .GroupBy(p => GetPeriodKey(invoiceDateMap[p.InvoiceId], periodType))
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
            .Join(
                dbContext.Customers,
                invoice => invoice.CustomerId,
                customer => customer.Id,
                (invoice, customer) => new OutstandingInvoiceDto(
                    invoice.Id,
                    invoice.InvoiceNumber,
                    customer.BusinessName ?? customer.ContactName ?? string.Empty,
                    invoice.IssueDate,
                    invoice.DueDate,
                    invoice.Currency,
                    invoice.AmountDue,
                    invoice.Status.ToString()))
            .OrderByDescending(x => x.DueDate)
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
            .Join(
                dbContext.Customers,
                invoice => invoice.CustomerId,
                customer => customer.Id,
                (invoice, customer) => new OverdueInvoiceDto(
                    invoice.Id,
                    invoice.InvoiceNumber,
                    customer.BusinessName ?? customer.ContactName ?? string.Empty,
                    invoice.IssueDate,
                    invoice.DueDate,
                    invoice.Currency,
                    invoice.AmountDue,
                    invoice.Status.ToString()))
            .OrderByDescending(x => x.DueDate)
            .ToListAsync(cancellationToken);

        return invoices;
    }
}
