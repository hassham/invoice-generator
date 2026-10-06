using InvoiceApp.Application.Documents;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace InvoiceApp.Modules.Documents.Pdf;

public sealed class ReceiptPdfDocument(ReceiptPdfRequest request) : IDocument
{
    public DocumentMetadata GetMetadata() => DocumentMetadata.Default;

    public DocumentSettings GetSettings() => DocumentSettings.Default;

    public void Compose(IDocumentContainer container)
    {
        container.Page(page =>
        {
            page.Size(PageSizes.A4);
            page.Margin(36);
            page.DefaultTextStyle(style => style.FontFamily("Calibri").FontSize(10));

            page.Header().Height(12).Background("#0f172a");

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
                        fromColumn.Item().Text(request.BusinessName);
                    });
                    row.ConstantItem(180).Column(receiptColumn =>
                    {
                        receiptColumn.Item().AlignRight().Text("RECEIPT")
                            .FontColor("#0f172a").SemiBold().FontSize(10);
                        receiptColumn.Item().AlignRight().Text(request.ReceiptNumber)
                            .FontColor("#0f172a").SemiBold().FontSize(16);
                    });
                });

                column.Item().PaddingVertical(4).BorderBottom(1).BorderColor("#e5e7eb");

                column.Item().Row(row =>
                {
                    row.RelativeItem().Column(c =>
                    {
                        c.Item().Text("Receipt Date").SemiBold().FontSize(9).FontColor("#6b7280");
                        c.Item().Text(request.IssueDate.ToString("dd MMM yyyy"));
                    });

                    row.RelativeItem().Column(c =>
                    {
                        c.Item().Text("Payment Date").SemiBold().FontSize(9).FontColor("#6b7280");
                        c.Item().Text(request.PaymentDate.ToString("dd MMM yyyy"));
                    });

                    row.RelativeItem().Column(c =>
                    {
                        c.Item().Text("Payment Method").SemiBold().FontSize(9).FontColor("#6b7280");
                        c.Item().Text(request.PaymentMethod);
                    });

                    row.RelativeItem().Column(c =>
                    {
                        c.Item().Text("Invoice").SemiBold().FontSize(9).FontColor("#6b7280");
                        c.Item().Text(request.InvoiceNumber);
                    });
                });

                column.Item().PaddingVertical(16).Column(c =>
                {
                    c.Item().Text("Payment Received").SemiBold().FontSize(12);
                    c.Item().PaddingTop(8).Row(row =>
                    {
                        row.RelativeItem().AlignLeft().Column(label =>
                        {
                            label.Item().Text("Amount").SemiBold().FontSize(9).FontColor("#6b7280");
                        });

                        row.ConstantItem(120).AlignRight().Column(value =>
                        {
                            value.Item().Text($"{request.Currency} {request.Amount:0.00}")
                                .SemiBold().FontSize(14).FontColor("#0f172a");
                        });
                    });
                });

                column.Item().PaddingVertical(12).Column(c =>
                {
                    c.Item().Text("Thank you for your payment.").SemiBold().FontSize(10);
                    if (!string.IsNullOrWhiteSpace(request.BusinessEmail))
                    {
                        c.Item().PaddingTop(4).Text($"For enquiries, please contact us at {request.BusinessEmail}").FontSize(9).FontColor("#6b7280");
                    }
                });
            });

            page.Footer().AlignCenter().Text($"Receipt {request.ReceiptNumber} - Generated on {DateTime.Now:dd MMM yyyy HH:mm}")
                .FontSize(8).FontColor("#9ca3af");
        });
    }

    private static bool TryDecodeLogo(string base64, out byte[] logoBytes)
    {
        try
        {
            logoBytes = Convert.FromBase64String(base64);
            return true;
        }
        catch
        {
            logoBytes = [];
            return false;
        }
    }
}
