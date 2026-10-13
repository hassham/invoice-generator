using InvoiceApp.Application.Email;
using InvoiceApp.Application.Invoicing;
using InvoiceApp.Domain.Invoicing;
using InvoiceApp.Modules.Documents.Pdf;
using InvoiceApp.Modules.Invoicing;
using QuestPDF.Fluent;

namespace InvoiceApp.Api.Services;

/// <summary>
/// IG-311: the one place an invoice email is actually assembled and sent. Lifted verbatim out of
/// InvoiceEndpoints.SendEmailAsync so the recurring generation job's Automatic Send produces the
/// same email a user gets when they press Send — same PDF, same hosted link, same
/// <c>InvoiceEmailLog</c> entry — rather than a near-copy that drifts.
///
/// It lives in the Api project because that is the only one allowed to reference both the PDF
/// module and the message builder (docs/SAD.md §26-27).
/// </summary>
public sealed class InvoiceEmailDispatcher(
    IInvoiceService invoiceService,
    IEmailSender emailSender,
    IConfiguration configuration) : IInvoiceEmailDispatcher
{
    public async Task SendAsync(
        Guid userId,
        Guid businessId,
        Guid invoiceId,
        InvoiceEmailRequest request,
        CancellationToken cancellationToken)
    {
        var context = await invoiceService.PrepareInvoiceEmailAsync(userId, businessId, invoiceId, cancellationToken);
        var pdfBytes = new InvoicePdfDocument(context.PdfRequest).GeneratePdf();
        var pdfFileName = InvoiceFilenameGenerator.Generate(context.PdfRequest.InvoiceNumber);
        var frontendBaseUrl = configuration["Frontend:BaseUrl"] ?? "http://localhost:3000";
        var hostedLink = $"{frontendBaseUrl}/i/{context.PublicToken}";
        var message = InvoiceEmailMessageBuilder.Build(request, hostedLink, pdfBytes, pdfFileName, context.BusinessEmail);

        // IG-246: each email gets its own open token, embedded as a tracking pixel. The token is stored on the
        // log row so a later pixel load can be attributed to this email.
        var openToken = EmailOpenTracking.NewToken();
        var apiBaseUrl = configuration["Api:PublicBaseUrl"] ?? "http://localhost:5094";
        var trackedMessage = message with
        {
            HtmlBody = message.HtmlBody + EmailOpenTracking.PixelHtml(EmailOpenTracking.PixelUrl(apiBaseUrl, openToken)),
        };

        try
        {
            await emailSender.SendAsync(trackedMessage, cancellationToken);
        }
        catch (Exception ex)
        {
            // The failure is recorded before it is rethrown, so a send that blew up is still
            // visible in the invoice's email history rather than vanishing with the exception.
            await invoiceService.RecordEmailSentAsync(userId, businessId, invoiceId, request, InvoiceEmailStatus.Failed, ex.Message, cancellationToken, openToken);
            throw;
        }

        await invoiceService.RecordEmailSentAsync(userId, businessId, invoiceId, request, InvoiceEmailStatus.Sent, null, cancellationToken, openToken);
    }
}
