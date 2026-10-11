using System.Security.Claims;
using InvoiceApp.Application.Businesses;
using InvoiceApp.Application.Dashboard;
using InvoiceApp.Application.Reporting;
using InvoiceApp.Modules.Documents.Pdf;
using QuestPDF.Fluent;

namespace InvoiceApp.Api.Endpoints;

public static class DashboardEndpoints
{
    public static IEndpointRouteBuilder MapDashboardEndpoints(this IEndpointRouteBuilder app)
    {
        // FSD section 98. Account-owned aggregation, so requires a session like the other
        // invoice/customer read endpoints.
        app.MapGet("/api/v1/businesses/{businessId:guid}/dashboard/summary", GetSummaryAsync).RequireAuthorization();
        // IG-224: revenue report endpoint
        app.MapGet("/api/v1/businesses/{businessId:guid}/reports/revenue", GetRevenueReportAsync).RequireAuthorization();
        // IG-225: outstanding and overdue invoice reports
        app.MapGet("/api/v1/businesses/{businessId:guid}/reports/outstanding", GetOutstandingReportAsync).RequireAuthorization();
        app.MapGet("/api/v1/businesses/{businessId:guid}/reports/overdue", GetOverdueReportAsync).RequireAuthorization();
        // IG-226: revenue by customer report
        app.MapGet("/api/v1/businesses/{businessId:guid}/reports/by-customer", GetRevenueByCustomerAsync).RequireAuthorization();
        // IG-227: tax summary report
        app.MapGet("/api/v1/businesses/{businessId:guid}/reports/tax-summary", GetTaxSummaryAsync).RequireAuthorization();
        // IG-228: CSV export endpoints
        app.MapGet("/api/v1/businesses/{businessId:guid}/reports/revenue/export/csv", ExportRevenueReportCsvAsync).RequireAuthorization();
        app.MapGet("/api/v1/businesses/{businessId:guid}/reports/outstanding/export/csv", ExportOutstandingInvoicesCsvAsync).RequireAuthorization();
        app.MapGet("/api/v1/businesses/{businessId:guid}/reports/overdue/export/csv", ExportOverdueInvoicesCsvAsync).RequireAuthorization();
        app.MapGet("/api/v1/businesses/{businessId:guid}/reports/by-customer/export/csv", ExportRevenueByCustomerCsvAsync).RequireAuthorization();
        app.MapGet("/api/v1/businesses/{businessId:guid}/reports/tax-summary/export/csv", ExportTaxSummaryCsvAsync).RequireAuthorization();
        // IG-275: PDF export endpoints, one per report, mirroring the CSV set above.
        app.MapGet("/api/v1/businesses/{businessId:guid}/reports/revenue/export/pdf", ExportRevenueReportPdfAsync).RequireAuthorization();
        app.MapGet("/api/v1/businesses/{businessId:guid}/reports/outstanding/export/pdf", ExportOutstandingInvoicesPdfAsync).RequireAuthorization();
        app.MapGet("/api/v1/businesses/{businessId:guid}/reports/overdue/export/pdf", ExportOverdueInvoicesPdfAsync).RequireAuthorization();
        app.MapGet("/api/v1/businesses/{businessId:guid}/reports/by-customer/export/pdf", ExportRevenueByCustomerPdfAsync).RequireAuthorization();
        app.MapGet("/api/v1/businesses/{businessId:guid}/reports/tax-summary/export/pdf", ExportTaxSummaryPdfAsync).RequireAuthorization();
        return app;
    }

    private static async Task<IResult> GetSummaryAsync(
        Guid businessId,
        ClaimsPrincipal user,
        IDashboardService dashboardService,
        CancellationToken cancellationToken,
        DateOnly? startDate = null,
        DateOnly? endDate = null)
    {
        var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var summary = await dashboardService.GetSummaryAsync(userId, businessId, startDate, endDate, cancellationToken);
        return Results.Ok(summary);
    }

    private static async Task<IResult> GetRevenueReportAsync(
        Guid businessId,
        ClaimsPrincipal user,
        IReportingService reportingService,
        CancellationToken cancellationToken,
        string periodType = "month",
        DateOnly? startDate = null,
        DateOnly? endDate = null)
    {
        if (!IsValidPeriodType(periodType))
        {
            return Results.BadRequest(new { detail = "periodType must be 'month', 'quarter', or 'year'." });
        }

        var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var report = await reportingService.GetRevenueReportAsync(userId, businessId, periodType, startDate, endDate, cancellationToken);
        return Results.Ok(report);
    }

    private static bool IsValidPeriodType(string periodType)
    {
        return periodType.ToLower() switch
        {
            "month" or "quarter" or "year" => true,
            _ => false,
        };
    }

    private static async Task<IResult> GetOutstandingReportAsync(
        Guid businessId,
        ClaimsPrincipal user,
        IReportingService reportingService,
        CancellationToken cancellationToken)
    {
        var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var report = await reportingService.GetOutstandingReportAsync(userId, businessId, cancellationToken);
        return Results.Ok(report);
    }

    private static async Task<IResult> GetOverdueReportAsync(
        Guid businessId,
        ClaimsPrincipal user,
        IReportingService reportingService,
        CancellationToken cancellationToken)
    {
        var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var report = await reportingService.GetOverdueReportAsync(userId, businessId, cancellationToken);
        return Results.Ok(report);
    }

    private static async Task<IResult> GetRevenueByCustomerAsync(
        Guid businessId,
        ClaimsPrincipal user,
        IReportingService reportingService,
        CancellationToken cancellationToken,
        DateOnly? startDate = null,
        DateOnly? endDate = null)
    {
        var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var report = await reportingService.GetRevenueByCustomerAsync(userId, businessId, startDate, endDate, cancellationToken);
        return Results.Ok(report);
    }

    private static async Task<IResult> GetTaxSummaryAsync(
        Guid businessId,
        ClaimsPrincipal user,
        IReportingService reportingService,
        CancellationToken cancellationToken,
        DateOnly? startDate = null,
        DateOnly? endDate = null)
    {
        var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var report = await reportingService.GetTaxSummaryAsync(userId, businessId, startDate, endDate, cancellationToken);
        return Results.Ok(report);
    }

    private static async Task<IResult> ExportRevenueReportCsvAsync(
        Guid businessId,
        ClaimsPrincipal user,
        IReportingService reportingService,
        IExportService exportService,
        CancellationToken cancellationToken,
        string periodType = "month",
        DateOnly? startDate = null,
        DateOnly? endDate = null)
    {
        if (!IsValidPeriodType(periodType))
        {
            return Results.BadRequest(new { detail = "periodType must be 'month', 'quarter', or 'year'." });
        }

        var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var report = await reportingService.GetRevenueReportAsync(userId, businessId, periodType, startDate, endDate, cancellationToken);
        var csv = await exportService.ExportRevenueReportToCsvAsync(report);

        return Results.File(
            System.Text.Encoding.UTF8.GetBytes(csv),
            "text/csv",
            $"revenue-report-{periodType}.csv");
    }

    private static async Task<IResult> ExportOutstandingInvoicesCsvAsync(
        Guid businessId,
        ClaimsPrincipal user,
        IReportingService reportingService,
        IExportService exportService,
        CancellationToken cancellationToken)
    {
        var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var invoices = await reportingService.GetOutstandingReportAsync(userId, businessId, cancellationToken);
        var csv = await exportService.ExportOutstandingInvoicesToCsvAsync(invoices);

        return Results.File(
            System.Text.Encoding.UTF8.GetBytes(csv),
            "text/csv",
            "outstanding-invoices.csv");
    }

    private static async Task<IResult> ExportOverdueInvoicesCsvAsync(
        Guid businessId,
        ClaimsPrincipal user,
        IReportingService reportingService,
        IExportService exportService,
        CancellationToken cancellationToken)
    {
        var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var invoices = await reportingService.GetOverdueReportAsync(userId, businessId, cancellationToken);
        var csv = await exportService.ExportOverdueInvoicesToCsvAsync(invoices);

        return Results.File(
            System.Text.Encoding.UTF8.GetBytes(csv),
            "text/csv",
            "overdue-invoices.csv");
    }

    private static async Task<IResult> ExportRevenueByCustomerCsvAsync(
        Guid businessId,
        ClaimsPrincipal user,
        IReportingService reportingService,
        IExportService exportService,
        CancellationToken cancellationToken,
        DateOnly? startDate = null,
        DateOnly? endDate = null)
    {
        var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var customers = await reportingService.GetRevenueByCustomerAsync(userId, businessId, startDate, endDate, cancellationToken);
        var csv = await exportService.ExportRevenueByCustomerToCsvAsync(customers);

        return Results.File(
            System.Text.Encoding.UTF8.GetBytes(csv),
            "text/csv",
            "revenue-by-customer.csv");
    }

    private static async Task<IResult> ExportTaxSummaryCsvAsync(
        Guid businessId,
        ClaimsPrincipal user,
        IReportingService reportingService,
        IExportService exportService,
        CancellationToken cancellationToken,
        DateOnly? startDate = null,
        DateOnly? endDate = null)
    {
        var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var summary = await reportingService.GetTaxSummaryAsync(userId, businessId, startDate, endDate, cancellationToken);
        var csv = await exportService.ExportTaxSummaryToCsvAsync(summary);

        return Results.File(
            System.Text.Encoding.UTF8.GetBytes(csv),
            "text/csv",
            "tax-summary.csv");
    }

    // IG-275: PDF export endpoints. Each one calls the SAME IReportingService method with the SAME
    // arguments as the JSON and CSV endpoints above, then formats the result - that is what makes
    // "exported PDF matches the displayed figures and applied filters" true by construction rather
    // than by assertion. Rendering lives in InvoiceApp.Modules.Documents (QuestPDF), not on
    // IExportService: IExportService sits in Application, which must not depend on a PDF library,
    // and only InvoiceApp.Api may reference the Documents module. ModuleReferenceBoundaryTests
    // enforces both.
    private static async Task<IResult> ExportRevenueReportPdfAsync(
        Guid businessId,
        ClaimsPrincipal user,
        IReportingService reportingService,
        IBusinessService businessService,
        CancellationToken cancellationToken,
        string periodType = "month",
        DateOnly? startDate = null,
        DateOnly? endDate = null)
    {
        if (!IsValidPeriodType(periodType))
        {
            return Results.BadRequest(new { detail = "periodType must be 'month', 'quarter', or 'year'." });
        }

        var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var (effectiveStart, effectiveEnd) = EffectiveRange(startDate, endDate);
        var business = await businessService.GetAsync(userId, businessId, cancellationToken);
        var report = await reportingService.GetRevenueReportAsync(
            userId, businessId, periodType, effectiveStart, effectiveEnd, cancellationToken);

        var request = new ReportPdfRequest(
            Title: "Revenue Report",
            BusinessName: business.BusinessName,
            Subtitle: $"{RangeLabel(effectiveStart, effectiveEnd)} - by {periodType.ToLowerInvariant()}",
            Currency: report.Currency,
            Summary:
            [
                new ReportPdfSummaryLine(
                    "Total Revenue",
                    Money(report.Periods.Sum(p => p.Revenue), report.Currency))
            ],
            Columns:
            [
                new ReportPdfColumn("Period", RelativeWidth: 2f),
                new ReportPdfColumn("Revenue", AlignRight: true)
            ],
            Rows: [.. report.Periods.Select(p => (IReadOnlyList<string>)
                [p.Period, Money(p.Revenue, report.Currency)])],
            EmptyMessage: "No periods in this range.");

        return PdfResult(request, $"revenue-report-{periodType}");
    }

    private static async Task<IResult> ExportOutstandingInvoicesPdfAsync(
        Guid businessId,
        ClaimsPrincipal user,
        IReportingService reportingService,
        IBusinessService businessService,
        CancellationToken cancellationToken)
    {
        var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var business = await businessService.GetAsync(userId, businessId, cancellationToken);
        var invoices = await reportingService.GetOutstandingReportAsync(userId, businessId, cancellationToken);

        return PdfResult(
            InvoiceTableRequest("Outstanding Invoices", business.BusinessName, business.DefaultCurrency, invoices
                .Select(i => new InvoiceRow(i.InvoiceNumber, i.CustomerName, i.IssueDate, i.DueDate, i.Currency, i.AmountDue, i.Status))
                .ToList(),
                "No outstanding invoices - everything issued has been paid."),
            "outstanding-invoices");
    }

    private static async Task<IResult> ExportOverdueInvoicesPdfAsync(
        Guid businessId,
        ClaimsPrincipal user,
        IReportingService reportingService,
        IBusinessService businessService,
        CancellationToken cancellationToken)
    {
        var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var business = await businessService.GetAsync(userId, businessId, cancellationToken);
        var invoices = await reportingService.GetOverdueReportAsync(userId, businessId, cancellationToken);

        return PdfResult(
            InvoiceTableRequest("Overdue Invoices", business.BusinessName, business.DefaultCurrency, invoices
                .Select(i => new InvoiceRow(i.InvoiceNumber, i.CustomerName, i.IssueDate, i.DueDate, i.Currency, i.AmountDue, i.Status))
                .ToList(),
                "No overdue invoices - nothing is past its due date."),
            "overdue-invoices");
    }

    private static async Task<IResult> ExportRevenueByCustomerPdfAsync(
        Guid businessId,
        ClaimsPrincipal user,
        IReportingService reportingService,
        IBusinessService businessService,
        CancellationToken cancellationToken,
        DateOnly? startDate = null,
        DateOnly? endDate = null)
    {
        var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var (effectiveStart, effectiveEnd) = EffectiveRange(startDate, endDate);
        var business = await businessService.GetAsync(userId, businessId, cancellationToken);
        var customers = await reportingService.GetRevenueByCustomerAsync(
            userId, businessId, effectiveStart, effectiveEnd, cancellationToken);

        var currency = customers.Count > 0 ? customers[0].Currency : business.DefaultCurrency;

        var request = new ReportPdfRequest(
            Title: "Revenue by Customer",
            BusinessName: business.BusinessName,
            Subtitle: RangeLabel(effectiveStart, effectiveEnd),
            Currency: currency,
            Summary:
            [
                new ReportPdfSummaryLine("Total Revenue", Money(customers.Sum(c => c.Revenue), currency))
            ],
            Columns:
            [
                new ReportPdfColumn("Customer", RelativeWidth: 3f),
                new ReportPdfColumn("Revenue", AlignRight: true)
            ],
            Rows: [.. customers.Select(c => (IReadOnlyList<string>)
                [c.CustomerName, Money(c.Revenue, c.Currency)])],
            EmptyMessage: "No customers yet.");

        return PdfResult(request, "revenue-by-customer");
    }

    private static async Task<IResult> ExportTaxSummaryPdfAsync(
        Guid businessId,
        ClaimsPrincipal user,
        IReportingService reportingService,
        IBusinessService businessService,
        CancellationToken cancellationToken,
        DateOnly? startDate = null,
        DateOnly? endDate = null)
    {
        var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var (effectiveStart, effectiveEnd) = EffectiveRange(startDate, endDate);
        var business = await businessService.GetAsync(userId, businessId, cancellationToken);
        var summary = await reportingService.GetTaxSummaryAsync(
            userId, businessId, effectiveStart, effectiveEnd, cancellationToken);

        var request = new ReportPdfRequest(
            Title: "Tax Summary",
            BusinessName: business.BusinessName,
            // IG-313/IG-314: the basis and which invoices count are stated on the document itself.
            // This is the figure someone transcribes onto a tax return, and a printed total with no
            // stated basis is the kind of thing that gets filed and then argued about.
            Subtitle: $"{RangeLabel(effectiveStart, effectiveEnd)} - excluding cancelled",
            Currency: summary.Currency,
            Summary:
            [
                new ReportPdfSummaryLine("Total Taxable", Money(summary.TotalTaxableAmount, summary.Currency)),
                new ReportPdfSummaryLine("Total Tax", Money(summary.TotalTaxCollected, summary.Currency))
            ],
            Columns:
            [
                new ReportPdfColumn("Tax Rate", RelativeWidth: 2f),
                new ReportPdfColumn("Taxable Amount", AlignRight: true, RelativeWidth: 2f),
                new ReportPdfColumn("Tax", AlignRight: true, RelativeWidth: 2f)
            ],
            Rows: [.. summary.TaxesByRate.Select(t => (IReadOnlyList<string>)
            [
                $"{t.TaxRate:0.00}%",
                Money(t.TaxableAmount, summary.Currency),
                Money(t.TaxCollected, summary.Currency)
            ])],
            EmptyMessage: "No tax charged in this period.");

        return PdfResult(request, "tax-summary");
    }

    private sealed record InvoiceRow(
        string InvoiceNumber,
        string CustomerName,
        DateOnly IssueDate,
        DateOnly DueDate,
        string Currency,
        decimal AmountDue,
        string Status);

    /// <summary>The outstanding and overdue reports are the same seven columns over the same shape,
    /// so they share one builder rather than two near-identical copies.</summary>
    private static ReportPdfRequest InvoiceTableRequest(
        string title,
        string businessName,
        string defaultCurrency,
        List<InvoiceRow> rows,
        string emptyMessage)
    {
        // Falls back to the business's own currency rather than leaving it null: an empty report
        // still prints a "Total Due" of zero, and a bare "0.00" with no currency beside it reads
        // like a rendering fault rather than an answer.
        var currency = rows.Count > 0 ? rows[0].Currency : defaultCurrency;

        return new ReportPdfRequest(
            Title: title,
            BusinessName: businessName,
            Subtitle: $"As at {DateOnly.FromDateTime(DateTime.UtcNow):dd MMM yyyy}",
            Currency: currency,
            Summary:
            [
                new ReportPdfSummaryLine("Invoices", rows.Count.ToString()),
                new ReportPdfSummaryLine("Total Due", Money(rows.Sum(r => r.AmountDue), currency))
            ],
            Columns:
            [
                new ReportPdfColumn("Invoice", RelativeWidth: 1.5f),
                new ReportPdfColumn("Customer", RelativeWidth: 2.5f),
                new ReportPdfColumn("Issued"),
                new ReportPdfColumn("Due"),
                new ReportPdfColumn("Status"),
                new ReportPdfColumn("Amount Due", AlignRight: true, RelativeWidth: 1.5f)
            ],
            Rows: [.. rows.Select(r => (IReadOnlyList<string>)
            [
                r.InvoiceNumber,
                r.CustomerName,
                r.IssueDate.ToString("dd MMM yyyy"),
                r.DueDate.ToString("dd MMM yyyy"),
                r.Status,
                Money(r.AmountDue, r.Currency)
            ])],
            EmptyMessage: emptyMessage);
    }

    private static IResult PdfResult(ReportPdfRequest request, string fileStem) =>
        Results.File(
            new ReportPdfDocument(request).GeneratePdf(),
            "application/pdf",
            $"{fileStem}.pdf");

    /// <summary>
    /// IG-275: the PDF endpoints resolve the range themselves and pass it explicitly, so the dates
    /// printed on the document are provably the dates the figures were computed from. ReportingService
    /// applies the same defaults when these are null - keep the two in step if either changes.
    /// </summary>
    private static (DateOnly Start, DateOnly End) EffectiveRange(DateOnly? startDate, DateOnly? endDate)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        return (startDate ?? new DateOnly(today.Year, today.Month, 1), endDate ?? today);
    }

    private static string RangeLabel(DateOnly start, DateOnly end) =>
        $"{start:dd MMM yyyy} to {end:dd MMM yyyy}";

    /// <summary>Money is formatted here rather than in the renderer so a report's PDF and its CSV
    /// cannot disagree about how the same figure is written.</summary>
    private static string Money(decimal amount, string? currency) =>
        string.IsNullOrWhiteSpace(currency) ? amount.ToString("0.00") : $"{currency} {amount:0.00}";
}
