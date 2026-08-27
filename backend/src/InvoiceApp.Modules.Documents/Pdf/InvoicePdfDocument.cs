using InvoiceApp.Application.Documents;
using InvoiceApp.Application.Invoicing;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace InvoiceApp.Modules.Documents.Pdf;

/// <summary>
/// Renders the same content InvoicePreview.tsx shows, in the same order, styled from the same
/// templateCustomization the frontend used - so the PDF matches what the user was previewing
/// rather than being an independently-designed document. Totals come from InvoiceCalculator
/// (the same authoritative engine /calculate uses), not recomputed here, so the numbers can't
/// drift from what the frontend/preview already agreed on.
/// </summary>
public sealed class InvoicePdfDocument(InvoicePdfRequest request) : IDocument
{
    public DocumentMetadata GetMetadata() => DocumentMetadata.Default;

    public DocumentSettings GetSettings() => DocumentSettings.Default;

    public void Compose(IDocumentContainer container)
    {
        var totals = InvoiceCalculator.Calculate(new InvoiceCalculationRequest(
            request.Items
                .Select(item => new InvoiceLineItemCalculationInput(item.Quantity, item.UnitPrice, item.TaxRate, item.Discount))
                .ToList(),
            request.InvoiceDiscountType,
            request.InvoiceDiscountValue,
            request.TaxCalculationMethod));

        var customization = request.TemplateCustomization;
        var primaryColor = customization?.PrimaryColor ?? "#0f172a";
        var accentColor = customization?.AccentColor ?? "#0f172a";
        var headerStyle = customization?.HeaderStyle ?? "Banner";
        var fontFamily = MapFontFamily(customization?.Font);

        container.Page(page =>
        {
            page.Size(PageSizes.A4);
            page.Margin(36);
            page.DefaultTextStyle(style => style.FontFamily(fontFamily).FontSize(10));

            if (headerStyle == "Banner")
            {
                page.Header().Height(12).Background(primaryColor);
            }

            page.Content().PaddingTop(16).Column(column =>
            {
                column.Spacing(4);

                column.Item().Row(row =>
                {
                    row.RelativeItem().Column(fromColumn =>
                    {
                        if (!string.IsNullOrWhiteSpace(request.Logo) && TryDecodeLogo(request.Logo, out var logoBytes))
                        {
                            fromColumn.Item().Height(40).AlignLeft().Image(logoBytes).FitHeight();
                        }
                        fromColumn.Item().Text("From").SemiBold();
                        fromColumn.Item().Text(request.Seller);
                    });
                    row.ConstantItem(180).Column(invoiceColumn =>
                    {
                        invoiceColumn.Item().AlignRight().Text(string.IsNullOrWhiteSpace(request.InvoiceNumber) ? "Invoice" : request.InvoiceNumber)
                            .FontColor(accentColor).SemiBold().FontSize(16);
                        invoiceColumn.Item().AlignRight().Text(request.Currency);
                    });
                });

                if (headerStyle == "Bordered")
                {
                    column.Item().PaddingBottom(4).BorderBottom(2).BorderColor(accentColor);
                }

                column.Item().PaddingTop(8).Row(row =>
                {
                    row.RelativeItem().Text($"Issue date: {request.IssueDate:d MMM yyyy}");
                    row.RelativeItem().Text($"Due date: {request.DueDate:d MMM yyyy}");
                });

                if (!string.IsNullOrWhiteSpace(request.Reference))
                {
                    column.Item().Text($"Reference: {request.Reference}");
                }

                column.Item().PaddingTop(12).Text("Bill to").SemiBold();
                column.Item().Text(request.Customer);

                if (!string.IsNullOrWhiteSpace(request.ShipTo))
                {
                    column.Item().PaddingTop(12).Text("Ship to").SemiBold();
                    column.Item().Text(request.ShipTo);
                }

                column.Item().PaddingTop(16).Table(table =>
                {
                    table.ColumnsDefinition(columns =>
                    {
                        columns.RelativeColumn(3);
                        columns.RelativeColumn();
                        columns.RelativeColumn();
                        columns.RelativeColumn();
                    });

                    table.Header(header =>
                    {
                        header.Cell().Text("Description").SemiBold();
                        header.Cell().AlignRight().Text("Qty").SemiBold();
                        header.Cell().AlignRight().Text("Unit Price").SemiBold();
                        header.Cell().AlignRight().Text("Line Total").SemiBold();
                    });

                    for (var i = 0; i < request.Items.Count; i++)
                    {
                        var item = request.Items[i];
                        var lineResult = totals.Items[i];
                        table.Cell().Text(item.Description);
                        table.Cell().AlignRight().Text(item.Quantity.ToString("0.####"));
                        table.Cell().AlignRight().Text(item.UnitPrice.ToString("0.00"));
                        table.Cell().AlignRight().Text(lineResult.LineTotal.ToString("0.00"));
                    }
                });

                column.Item().PaddingTop(12).AlignRight().Column(totalsColumn =>
                {
                    totalsColumn.Item().Text($"Subtotal: {request.Currency} {totals.Subtotal:0.00}");
                    if (totals.DiscountAmount > 0)
                    {
                        totalsColumn.Item().Text($"Discount: -{request.Currency} {totals.DiscountAmount:0.00}");
                    }
                    totalsColumn.Item().Text($"Tax: {request.Currency} {totals.TaxAmount:0.00}");
                    totalsColumn.Item().Text($"Total: {request.Currency} {totals.TotalAmount:0.00}").SemiBold();
                });

                // FSD/IG-122: optional sections only render when they have content.
                if (!string.IsNullOrWhiteSpace(request.Notes))
                {
                    column.Item().PaddingTop(16).Text("Notes").SemiBold();
                    column.Item().Text(request.Notes);
                }

                if (!string.IsNullOrWhiteSpace(request.Terms))
                {
                    column.Item().PaddingTop(16).Text("Terms and Conditions").SemiBold();
                    column.Item().Text(request.Terms);
                }

                var paymentLines = GetPaymentInstructionLines(request.PaymentInstructions);
                if (paymentLines.Count > 0 || !string.IsNullOrWhiteSpace(request.CustomInstructions))
                {
                    column.Item().PaddingTop(16).Text("Payment Instructions").SemiBold();
                    foreach (var line in paymentLines)
                    {
                        column.Item().Text(line);
                    }
                    if (!string.IsNullOrWhiteSpace(request.CustomInstructions))
                    {
                        column.Item().PaddingTop(4).Text(request.CustomInstructions);
                    }
                }
            });
        });
    }

    private static List<string> GetPaymentInstructionLines(InvoicePdfPaymentInstructions? instructions)
    {
        var lines = new List<string>();
        if (instructions is null)
        {
            return lines;
        }

        void AddIfPresent(string label, string? value)
        {
            if (!string.IsNullOrWhiteSpace(value))
            {
                lines.Add($"{label}: {value}");
            }
        }

        AddIfPresent("Bank Name", instructions.BankName);
        AddIfPresent("Account Name", instructions.AccountName);
        AddIfPresent("BSB / Routing Number", instructions.Bsb);
        AddIfPresent("Account Number", instructions.AccountNumber);
        AddIfPresent("IBAN", instructions.Iban);
        AddIfPresent("SWIFT", instructions.Swift);
        AddIfPresent("Payment Reference", instructions.PaymentReference);
        return lines;
    }

    /// <summary>
    /// Maps frontend/app/invoice/create/lib/templateCustomization.ts's CSS font-family stacks to a
    /// single family name QuestPDF can request from the host. Relies on the host having these
    /// fonts installed - reliable cross-environment rendering would eventually want fonts embedded
    /// via QuestPDF's FontManager instead, but that's beyond this Story's scope.
    /// </summary>
    private static string MapFontFamily(string? cssFontStack) => cssFontStack switch
    {
        "Georgia, 'Times New Roman', serif" => "Times New Roman",
        "'Courier New', monospace" => "Courier New",
        _ => "Arial",
    };

    private static bool TryDecodeLogo(string dataUrl, out byte[] bytes)
    {
        var commaIndex = dataUrl.IndexOf(',');
        if (commaIndex < 0)
        {
            bytes = [];
            return false;
        }

        try
        {
            bytes = Convert.FromBase64String(dataUrl[(commaIndex + 1)..]);
            return true;
        }
        catch (FormatException)
        {
            bytes = [];
            return false;
        }
    }
}
