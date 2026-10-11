using InvoiceApp.Application.Reporting;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace InvoiceApp.Modules.Documents.Pdf;

/// <summary>
/// IG-275: renders any report as a PDF from the tabular <see cref="ReportPdfRequest"/>, matching the
/// visual language of InvoicePdfDocument and ReceiptPdfDocument - same dark header bar, same Calibri
/// at 10pt, same slate/grey palette - so an exported report does not look like it came from a
/// different product than the invoices beside it.
///
/// Deliberately knows nothing about revenue, tax or invoices. It renders a title, a filter line,
/// optional headline figures and one table. Adding a PDF for a sixth report is a matter of building
/// the request, not of touching this file.
/// </summary>
public sealed class ReportPdfDocument(ReportPdfRequest request) : IDocument
{
    private const string Ink = "#0f172a";
    private const string Muted = "#6b7280";
    private const string Faint = "#9ca3af";
    private const string Rule = "#e5e7eb";
    private const string HeaderFill = "#f9fafb";

    public DocumentMetadata GetMetadata() => DocumentMetadata.Default;

    public DocumentSettings GetSettings() => DocumentSettings.Default;

    public void Compose(IDocumentContainer container)
    {
        container.Page(page =>
        {
            page.Size(PageSizes.A4);
            page.Margin(36);
            page.DefaultTextStyle(style => style.FontFamily("Calibri").FontSize(10));

            page.Header().Height(12).Background(Ink);

            page.Content().PaddingTop(16).Column(column =>
            {
                column.Spacing(4);

                column.Item().Row(row =>
                {
                    row.RelativeItem().Column(businessColumn =>
                    {
                        businessColumn.Item().Text(request.BusinessName).SemiBold().FontSize(12);
                        if (!string.IsNullOrWhiteSpace(request.Currency))
                        {
                            businessColumn.Item().Text($"Figures in {request.Currency}")
                                .FontSize(9).FontColor(Muted);
                        }
                    });

                    row.ConstantItem(250).Column(titleColumn =>
                    {
                        titleColumn.Item().AlignRight().Text(request.Title.ToUpperInvariant())
                            .FontColor(Ink).SemiBold().FontSize(10);
                        if (!string.IsNullOrWhiteSpace(request.Subtitle))
                        {
                            titleColumn.Item().AlignRight().Text(request.Subtitle)
                                .FontSize(9).FontColor(Muted);
                        }
                    });
                });

                column.Item().PaddingVertical(4).BorderBottom(1).BorderColor(Rule);

                if (request.Summary.Count > 0)
                {
                    column.Item().PaddingTop(12).Row(row =>
                    {
                        foreach (var line in request.Summary)
                        {
                            row.RelativeItem().Column(c =>
                            {
                                c.Item().Text(line.Label).SemiBold().FontSize(9).FontColor(Muted);
                                c.Item().Text(line.Value).SemiBold().FontSize(13).FontColor(Ink);
                            });
                        }
                    });
                }

                if (request.Rows.Count == 0)
                {
                    // A report with no rows is an answer, not a failure - render the sentence rather
                    // than a table of headings with nothing under it.
                    column.Item().PaddingTop(20).Text(request.EmptyMessage).FontColor(Muted);
                }
                else
                {
                    column.Item().PaddingTop(16).Table(table =>
                    {
                        table.ColumnsDefinition(columns =>
                        {
                            foreach (var definition in request.Columns)
                            {
                                columns.RelativeColumn(definition.RelativeWidth);
                            }
                        });

                        table.Header(header =>
                        {
                            foreach (var definition in request.Columns)
                            {
                                var cell = header.Cell().Background(HeaderFill).PaddingVertical(4).PaddingHorizontal(4);
                                var text = definition.AlignRight ? cell.AlignRight() : cell;
                                text.Text(definition.Header).SemiBold().FontSize(9).FontColor(Muted);
                            }
                        });

                        foreach (var row in request.Rows)
                        {
                            for (var i = 0; i < request.Columns.Count; i++)
                            {
                                // Tolerate a short row rather than throwing mid-render: a ragged row
                                // is a caller bug, but half a generated PDF is worse than a blank
                                // cell, and the endpoint tests assert the cell counts line up.
                                var value = i < row.Count ? row[i] : string.Empty;
                                var cell = table.Cell().BorderBottom(1).BorderColor(Rule)
                                    .PaddingVertical(4).PaddingHorizontal(4);
                                var text = request.Columns[i].AlignRight ? cell.AlignRight() : cell;
                                text.Text(value);
                            }
                        }
                    });
                }
            });

            page.Footer().Row(row =>
            {
                row.RelativeItem().Text($"{request.Title} - {request.BusinessName}")
                    .FontSize(8).FontColor(Faint);
                row.ConstantItem(200).AlignRight().Text(text =>
                {
                    text.DefaultTextStyle(style => style.FontSize(8).FontColor(Faint));
                    text.Span($"Generated {DateTime.Now:dd MMM yyyy HH:mm} - page ");
                    text.CurrentPageNumber();
                    text.Span(" of ");
                    text.TotalPages();
                });
            });
        });
    }
}
