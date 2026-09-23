using System.Text;

namespace InvoiceApp.Application.Reporting;

/// <summary>
/// IG-228: Export report data to CSV and PDF formats.
/// </summary>
public interface IExportService
{
    /// <summary>
    /// Export revenue report to CSV format.
    /// </summary>
    Task<string> ExportRevenueReportToCsvAsync(RevenueReportDto report);

    /// <summary>
    /// Export outstanding invoices to CSV format.
    /// </summary>
    Task<string> ExportOutstandingInvoicesToCsvAsync(List<OutstandingInvoiceDto> invoices);

    /// <summary>
    /// Export overdue invoices to CSV format.
    /// </summary>
    Task<string> ExportOverdueInvoicesToCsvAsync(List<OverdueInvoiceDto> invoices);

    /// <summary>
    /// Export revenue by customer to CSV format.
    /// </summary>
    Task<string> ExportRevenueByCustomerToCsvAsync(List<RevenueByCustomerDto> customers);

    /// <summary>
    /// Export tax summary to CSV format.
    /// </summary>
    Task<string> ExportTaxSummaryToCsvAsync(TaxSummaryDto summary);
}

public sealed class ExportService : IExportService
{
    public Task<string> ExportRevenueReportToCsvAsync(RevenueReportDto report)
    {
        var csv = new StringBuilder();
        csv.AppendLine($"Revenue Report - {report.PeriodType}");
        csv.AppendLine($"Currency: {report.Currency}");
        csv.AppendLine();
        csv.AppendLine("Period,Revenue");

        foreach (var period in report.Periods)
        {
            csv.AppendLine($"{CsvEscape(period.Period)},{period.Revenue:F2}");
        }

        return Task.FromResult(csv.ToString());
    }

    public Task<string> ExportOutstandingInvoicesToCsvAsync(List<OutstandingInvoiceDto> invoices)
    {
        var csv = new StringBuilder();
        csv.AppendLine("Outstanding Invoices Report");
        csv.AppendLine();
        csv.AppendLine("Invoice Number,Customer,Issue Date,Due Date,Currency,Amount Due,Status");

        foreach (var invoice in invoices)
        {
            csv.AppendLine(
                $"{CsvEscape(invoice.InvoiceNumber)}," +
                $"{CsvEscape(invoice.CustomerName)}," +
                $"{invoice.IssueDate:yyyy-MM-dd}," +
                $"{invoice.DueDate:yyyy-MM-dd}," +
                $"{invoice.Currency}," +
                $"{invoice.AmountDue:F2}," +
                $"{CsvEscape(invoice.Status)}");
        }

        return Task.FromResult(csv.ToString());
    }

    public Task<string> ExportOverdueInvoicesToCsvAsync(List<OverdueInvoiceDto> invoices)
    {
        var csv = new StringBuilder();
        csv.AppendLine("Overdue Invoices Report");
        csv.AppendLine();
        csv.AppendLine("Invoice Number,Customer,Issue Date,Due Date,Currency,Amount Due,Status");

        foreach (var invoice in invoices)
        {
            csv.AppendLine(
                $"{CsvEscape(invoice.InvoiceNumber)}," +
                $"{CsvEscape(invoice.CustomerName)}," +
                $"{invoice.IssueDate:yyyy-MM-dd}," +
                $"{invoice.DueDate:yyyy-MM-dd}," +
                $"{invoice.Currency}," +
                $"{invoice.AmountDue:F2}," +
                $"{CsvEscape(invoice.Status)}");
        }

        return Task.FromResult(csv.ToString());
    }

    public Task<string> ExportRevenueByCustomerToCsvAsync(List<RevenueByCustomerDto> customers)
    {
        var csv = new StringBuilder();
        csv.AppendLine("Revenue by Customer Report");
        csv.AppendLine();
        csv.AppendLine("Customer,Revenue,Currency");

        foreach (var customer in customers)
        {
            csv.AppendLine(
                $"{CsvEscape(customer.CustomerName)}," +
                $"{customer.Revenue:F2}," +
                $"{customer.Currency}");
        }

        return Task.FromResult(csv.ToString());
    }

    public Task<string> ExportTaxSummaryToCsvAsync(TaxSummaryDto summary)
    {
        var csv = new StringBuilder();
        csv.AppendLine("Tax Summary Report");
        csv.AppendLine($"Currency: {summary.Currency}");
        csv.AppendLine();
        csv.AppendLine($"Total Taxable Amount,{summary.TotalTaxableAmount:F2}");
        csv.AppendLine($"Total Tax Collected,{summary.TotalTaxCollected:F2}");
        csv.AppendLine();
        csv.AppendLine("Tax Rate,Taxable Amount,Tax Collected");

        foreach (var tax in summary.TaxesByRate)
        {
            csv.AppendLine(
                $"{tax.TaxRate:F2}%," +
                $"{tax.TaxableAmount:F2}," +
                $"{tax.TaxCollected:F2}");
        }

        return Task.FromResult(csv.ToString());
    }

    private static string CsvEscape(string value)
    {
        if (string.IsNullOrEmpty(value))
            return string.Empty;

        if (value.Contains(",") || value.Contains("\"") || value.Contains("\n"))
        {
            return $"\"{value.Replace("\"", "\"\"")}\"";
        }

        return value;
    }
}
