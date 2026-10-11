namespace InvoiceApp.Application.Reporting;

/// <summary>
/// IG-275: one tabular shape that all five report PDFs render through, in the same spirit as
/// InvoicePdfRequest serving five document types via DocumentTypeLabel rather than five near-copies
/// of the same document class. A report PDF is a title, the filters it was produced under, an
/// optional set of headline figures and one table - none of the reports needs more than that, and a
/// sixth report should be able to add a PDF by building this record rather than by writing QuestPDF.
///
/// Deliberately a view model, not a report: it carries no figures of its own and does no arithmetic.
/// The endpoint builds it from the same IReportingService call that serves the on-screen report, so
/// the PDF cannot drift from what the user is looking at - which is IG-275's actual criterion.
/// </summary>
/// <param name="Title">What the report is, e.g. "Revenue Report".</param>
/// <param name="BusinessName">Whose report it is. Printed in the header.</param>
/// <param name="Subtitle">
/// The filters this was produced under, e.g. "1 Oct 2030 to 31 Oct 2030 - grouped by month".
/// Null for a report that takes no filters. This is the line that makes an exported PDF
/// self-describing: a printed table of figures with no stated range is unreadable a week later.
/// </param>
/// <param name="Currency">Printed alongside money columns; null for a report with no money.</param>
/// <param name="Summary">
/// Headline figures shown above the table, e.g. total tax collected. Empty for reports whose
/// table is the whole story.
/// </param>
/// <param name="Columns">The table's columns, in order. Must match every row's cell count.</param>
/// <param name="Rows">
/// The table body, already formatted as strings by the caller. Formatting money and dates is the
/// endpoint's job, not the renderer's, so that the PDF and the CSV of the same report cannot
/// disagree about how a figure is written.
/// </param>
/// <param name="EmptyMessage">
/// Shown instead of an empty table body. A report with no rows is a real answer - "you had no
/// overdue invoices" - and must not render as a bare set of column headings that looks broken.
/// </param>
public sealed record ReportPdfRequest(
    string Title,
    string BusinessName,
    string? Subtitle,
    string? Currency,
    IReadOnlyList<ReportPdfSummaryLine> Summary,
    IReadOnlyList<ReportPdfColumn> Columns,
    IReadOnlyList<IReadOnlyList<string>> Rows,
    string EmptyMessage = "No data for this period.");

/// <param name="Header">The column heading.</param>
/// <param name="AlignRight">
/// True for money and other numerics, so figures line up on their last digit the way the invoice
/// PDF already aligns its amounts. Text columns stay left.
/// </param>
/// <param name="RelativeWidth">
/// Share of the table width, as QuestPDF's RelativeColumn weight. The default of 1 spreads columns
/// evenly; give a name or description column more.
/// </param>
public sealed record ReportPdfColumn(
    string Header,
    bool AlignRight = false,
    float RelativeWidth = 1f);

/// <param name="Label">What the figure is.</param>
/// <param name="Value">The figure, already formatted.</param>
public sealed record ReportPdfSummaryLine(
    string Label,
    string Value);
