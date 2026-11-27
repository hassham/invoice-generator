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

        // Neutral document surfaces keep the sender's custom branding in the foreground.
        const string ink = "#171717";
        const string rule = "#DED6CC";
        const string totalsSurface = "#F8F2EA";
        var layout = request.TemplateCode is "studio" or "ledger" or "horizon" ? request.TemplateCode : "legacy";
        var (defaultPrimary, defaultAccent, defaultHeader) = layout switch
        {
            "studio" => ("#CFE9E0", "#1C584A", "Plain"),
            "ledger" => ("#F1F2F3", "#303640", "Plain"),
            "horizon" => ("#DDE8F8", "#213E69", "Bordered"),
            _ => ("#0f172a", "#0f172a", "Banner"),
        };
        var customization = request.TemplateCustomization;
        var primaryColor = SafeColor(customization?.PrimaryColor, defaultPrimary);
        var accentColor = SafeColor(customization?.AccentColor, defaultAccent);
        var headerStyle = customization?.HeaderStyle is "Banner" or "Bordered" or "Plain"
            ? customization.HeaderStyle
            : defaultHeader;
        var fontFamily = MapFontFamily(customization?.Font ?? (layout == "studio" ? "Georgia, 'Times New Roman', serif" : null));
        var title = request.DocumentTypeLabel.ToUpperInvariant();
        var number = string.IsNullOrWhiteSpace(request.InvoiceNumber) ? request.DocumentTypeLabel : request.InvoiceNumber;

        void ComposeSender(IContainer content, bool alignRight = false)
        {
            content.Column(sender =>
            {
                if (!string.IsNullOrWhiteSpace(request.Logo) && TryDecodeLogo(request.Logo, out var logoBytes))
                {
                    if (layout == "legacy")
                    {
                        sender.Item().Height(40).AlignLeft().Image(logoBytes).FitHeight();
                    }
                    else
                    {
                        var logo = sender.Item().Height(40);
                        (alignRight ? logo.AlignRight() : logo.AlignLeft()).MaxWidth(145).Image(logoBytes).FitArea();
                    }
                }

                IContainer Align(IContainer item) => alignRight ? item.AlignRight() : item;
                Align(sender.Item()).Text("From").SemiBold();
                Align(sender.Item()).Text(request.Seller);
            });
        }

        void ComposeIdentity(IContainer content, bool alignRight)
        {
            content.Column(identity =>
            {
                IContainer Align(IContainer item) => alignRight ? item.AlignRight() : item;
                Align(identity.Item()).Text(title).SemiBold().FontSize(layout == "legacy" ? 10 : 26);
                Align(identity.Item()).Text(number).SemiBold().FontSize(layout == "legacy" ? 22 : 13)
                    .FontColor(layout == "legacy" ? accentColor : ink);
                Align(identity.Item()).Text(request.Currency);
                if (headerStyle == "Plain")
                {
                    Align(identity.Item()).PaddingTop(4).Width(28).Height(2).Background(accentColor);
                }
            });
        }

        container.Page(page =>
        {
            page.Size(PageSizes.A4);
            page.Margin(36);
            page.DefaultTextStyle(style => style.FontFamily(fontFamily).FontSize(10).FontColor(ink));

            if (headerStyle == "Banner")
            {
                page.Header().Height(12).Background(primaryColor);
            }

            page.Content().PaddingTop(16).Column(column =>
            {
                column.Spacing(4);

                var heading = column.Item();
                if (layout == "studio")
                {
                    heading.Background(Tint(primaryColor, 25)).Padding(13).Column(studio =>
                    {
                        studio.Spacing(10);
                        ComposeIdentity(studio.Item(), alignRight: false);
                        ComposeSender(studio.Item());
                    });
                }
                else
                {
                    if (layout == "ledger")
                    {
                        heading = heading.BorderTop(2).BorderColor(accentColor).PaddingTop(8);
                    }

                    heading.Row(row =>
                    {
                        if (layout != "legacy")
                        {
                            row.Spacing(12);
                        }
                        if (layout == "horizon")
                        {
                            ComposeIdentity(row.RelativeItem(), alignRight: false);
                            ComposeSender(row.RelativeItem(), alignRight: true);
                        }
                        else
                        {
                            ComposeSender(row.RelativeItem());
                            ComposeIdentity(row.ConstantItem(180), alignRight: true);
                        }
                    });
                }

                if (headerStyle == "Bordered")
                {
                    column.Item().PaddingBottom(4).BorderBottom(3).BorderColor(accentColor);
                }

                column.Item().PaddingTop(8).Row(row =>
                {
                    row.RelativeItem().Text($"Issue date: {request.IssueDate:d MMM yyyy}");
                    // IG-308: omitted entirely for document types that have no due date, rather
                    // than printed with a stand-in value.
                    if (request.ShowDueDate)
                    {
                        row.RelativeItem().Text($"Due date: {request.DueDate:d MMM yyyy}");
                    }
                });

                if (!string.IsNullOrWhiteSpace(request.Reference))
                {
                    column.Item().Text($"Reference: {request.Reference}");
                }

                column.Item().PaddingTop(12).Text(request.CounterpartyLabel).SemiBold();
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
                        header.Cell().Element(TableHeaderCell).Text("Description").SemiBold();
                        header.Cell().Element(TableHeaderCell).AlignRight().Text("Qty").SemiBold();
                        header.Cell().Element(TableHeaderCell).AlignRight().Text("Unit Price").SemiBold();
                        header.Cell().Element(TableHeaderCell).AlignRight().Text("Line Total").SemiBold();
                    });

                    for (var i = 0; i < request.Items.Count; i++)
                    {
                        var item = request.Items[i];
                        var lineResult = totals.Items[i];
                        table.Cell().Element(TableBodyCell).Text(item.Description);
                        table.Cell().Element(TableBodyCell).AlignRight().Text(item.Quantity.ToString("0.####"));
                        table.Cell().Element(TableBodyCell).AlignRight().Text(item.UnitPrice.ToString("0.00"));
                        table.Cell().Element(TableBodyCell).AlignRight().Text(lineResult.LineTotal.ToString("0.00"));
                    }
                });

                IContainer TableHeaderCell(IContainer cell)
                {
                    cell = layout switch
                    {
                        "studio" => cell.Background(Tint(primaryColor, 22)),
                        "ledger" => cell.BorderTop(1).BorderBottom(1).BorderColor(accentColor).Background(Tint(primaryColor, 7)),
                        "horizon" => cell.Background(Tint(primaryColor, 14)),
                        _ => cell.Background(totalsSurface),
                    };
                    return cell.PaddingHorizontal(6).PaddingVertical(layout == "ledger" ? 4 : 7);
                }

                IContainer TableBodyCell(IContainer cell) =>
                    cell.BorderBottom(1).BorderColor(rule).PaddingHorizontal(6).PaddingVertical(layout == "ledger" ? 3 : 5);

                var totalsBox = column.Item().PaddingTop(12);
                totalsBox = layout == "horizon"
                    ? totalsBox.BorderLeft(4).BorderColor(accentColor).Background(Tint(primaryColor, 24))
                    : totalsBox.AlignRight().MaxWidth(230);
                totalsBox = layout switch
                {
                    "ledger" => totalsBox.Border(1).BorderColor(accentColor),
                    "studio" => totalsBox.Background(Tint(primaryColor, 14)),
                    "legacy" => totalsBox.Background(totalsSurface),
                    _ => totalsBox,
                };
                totalsBox.Padding(10).Column(totalsColumn =>
                {
                    totalsColumn.Spacing(3);
                    void TotalRow(string label, string value, bool emphasis = false)
                    {
                        var item = totalsColumn.Item();
                        if (emphasis)
                        {
                            item = item.BorderTop(1).BorderColor(rule).PaddingTop(5);
                        }

                        if (layout == "legacy")
                        {
                            var line = item.Text($"{label}: {value}");
                            if (emphasis)
                            {
                                line.SemiBold().FontSize(13);
                            }
                            return;
                        }

                        item.Row(row =>
                        {
                            row.Spacing(8);
                            var left = row.RelativeItem().Text(label);
                            var right = row.RelativeItem(2).AlignRight().Text(value);
                            if (emphasis)
                            {
                                left.SemiBold().FontSize(13);
                                right.SemiBold().FontSize(13);
                            }
                        });
                    }

                    TotalRow("Subtotal", $"{request.Currency} {totals.Subtotal:0.00}");
                    if (totals.DiscountAmount > 0)
                    {
                        TotalRow("Discount", $"-{request.Currency} {totals.DiscountAmount:0.00}");
                    }
                    TotalRow("Tax", $"{request.Currency} {totals.TaxAmount:0.00}");
                    TotalRow("Total", $"{request.Currency} {totals.TotalAmount:0.00}", emphasis: true);
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

    private static string SafeColor(string? value, string fallback) =>
        value is { Length: 7 } && value[0] == '#' && value.Skip(1).All(Uri.IsHexDigit) ? value : fallback;

    // Blend towards white, so customised colours never obscure text on a panel.
    private static string Tint(string color, int strength)
    {
        int Channel(int start) => (int.Parse(color.AsSpan(start, 2), System.Globalization.NumberStyles.HexNumber)
            * strength + 255 * (100 - strength) + 50) / 100;
        return $"#{Channel(1):X2}{Channel(3):X2}{Channel(5):X2}";
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
