using System.Security.Claims;
using InvoiceApp.Application.Email;
using InvoiceApp.Application.Estimates;
using InvoiceApp.Application.Invoicing;
using InvoiceApp.Domain.Estimates;
using InvoiceApp.Domain.Invoicing;
using InvoiceApp.Infrastructure.Configuration;
using InvoiceApp.Modules.Documents.Pdf;
using InvoiceApp.Modules.Invoicing;
using QuestPDF.Fluent;

namespace InvoiceApp.Api.Endpoints;

/// <summary>
/// IG-220: authenticated, account-owned - same shape as InvoiceEndpoints' Create/Update/Get/List.
/// IG-221 adds send-email/email-history, mirroring InvoiceEndpoints' own equivalents exactly.
/// IG-223 adds convert-to-invoice, which reuses the entire invoice creation/calculation pipeline.
/// Still deliberately without Cancel/Delete/Duplicate (out of this epic's current scope, see
/// IEstimateService's own doc comment). PDF rendering deliberately reuses the existing stateless
/// POST /api/v1/invoices/pdf endpoint directly rather than a parallel /api/v1/estimates/pdf one -
/// InvoicePdfRequest is a pure value shape with no persisted-invoice coupling, and now carries a
/// DocumentTypeLabel field precisely so both document types can share this one endpoint.
/// </summary>
public static class EstimateEndpoints
{
    public static IEndpointRouteBuilder MapEstimateEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/v1/estimates", CreateAsync).RequireAuthorization();
        app.MapPut("/api/v1/estimates/{id:guid}", UpdateAsync).RequireAuthorization();
        app.MapGet("/api/v1/estimates/{id:guid}", GetAsync).RequireAuthorization();
        app.MapGet("/api/v1/estimates", ListAsync).RequireAuthorization();
        // IG-221: same authenticated + rate-limited treatment as InvoiceEndpoints.SendEmailAsync -
        // a real external side effect (an actual email sent to a caller-supplied address).
        app.MapPost("/api/v1/estimates/{id:guid}/send-email", SendEmailAsync).RequireAuthorization().RequireRateLimiting(RateLimitingOptions.AuthPolicyName);
        app.MapGet("/api/v1/estimates/{id:guid}/email-history", GetEmailHistoryAsync).RequireAuthorization();
        // IG-223: convert an Accepted estimate to an invoice - reuses the entire invoice
        // creation/calculation pipeline, returns the new invoice ID.
        app.MapPost("/api/v1/estimates/{id:guid}/convert-to-invoice", ConvertToInvoiceAsync).RequireAuthorization();
        return app;
    }

    private static async Task<IResult> CreateAsync(
        EstimateSaveRequest request,
        ClaimsPrincipal user,
        IEstimateService estimateService,
        CancellationToken cancellationToken)
    {
        EstimateSaveRequestValidator.Validate(request);

        var estimate = await estimateService.SaveAsync(UserId(user), estimateId: null, request, cancellationToken);
        return Results.Created($"/api/v1/estimates/{estimate.Id}", estimate);
    }

    private static async Task<IResult> UpdateAsync(
        Guid id,
        EstimateSaveRequest request,
        ClaimsPrincipal user,
        IEstimateService estimateService,
        CancellationToken cancellationToken)
    {
        EstimateSaveRequestValidator.Validate(request);

        var estimate = await estimateService.SaveAsync(UserId(user), id, request, cancellationToken);
        return Results.Ok(estimate);
    }

    private static async Task<IResult> GetAsync(
        Guid id,
        ClaimsPrincipal user,
        IEstimateService estimateService,
        CancellationToken cancellationToken)
    {
        var estimate = await estimateService.GetAsync(UserId(user), id, cancellationToken);
        return Results.Ok(estimate);
    }

    private static async Task<IResult> ListAsync(
        ClaimsPrincipal user,
        IEstimateService estimateService,
        CancellationToken cancellationToken,
        int page = 1,
        int pageSize = 25,
        string? search = null,
        EstimateStatus? status = null)
    {
        var query = new EstimateListQuery(page, pageSize, search, status);
        var result = await estimateService.ListAsync(UserId(user), query, cancellationToken);
        return Results.Ok(result);
    }

    /// <summary>IG-221: mirrors InvoiceEndpoints.SendEmailAsync exactly - QuestPDF rendering and
    /// SMTP delivery are endpoint-layer concerns, records the attempt either way (a failed send is
    /// still something the account owner needs visibility into).</summary>
    private static async Task<IResult> SendEmailAsync(
        Guid id,
        InvoiceEmailRequest request,
        ClaimsPrincipal user,
        IEstimateService estimateService,
        IEmailSender emailSender,
        IConfiguration configuration,
        CancellationToken cancellationToken)
    {
        InvoiceEmailRequestValidator.Validate(request);

        var userId = UserId(user);
        var context = await estimateService.PrepareEstimateEmailAsync(userId, id, cancellationToken);
        var pdfBytes = new InvoicePdfDocument(context.PdfRequest).GeneratePdf();
        var pdfFileName = InvoiceFilenameGenerator.Generate(context.PdfRequest.InvoiceNumber, "Estimate");
        var frontendBaseUrl = configuration["Frontend:BaseUrl"] ?? "http://localhost:3000";
        var hostedLink = $"{frontendBaseUrl}/e/{context.PublicToken}";
        var message = InvoiceEmailMessageBuilder.Build(request, hostedLink, pdfBytes, pdfFileName, context.BusinessEmail, "estimate");

        try
        {
            await emailSender.SendAsync(message, cancellationToken);
        }
        catch (Exception ex)
        {
            await estimateService.RecordEstimateEmailSentAsync(userId, id, request, InvoiceEmailStatus.Failed, ex.Message, cancellationToken);
            throw;
        }

        await estimateService.RecordEstimateEmailSentAsync(userId, id, request, InvoiceEmailStatus.Sent, null, cancellationToken);
        return Results.NoContent();
    }

    private static async Task<IResult> GetEmailHistoryAsync(
        Guid id,
        ClaimsPrincipal user,
        IEstimateService estimateService,
        CancellationToken cancellationToken)
    {
        var history = await estimateService.GetEstimateEmailHistoryAsync(UserId(user), id, cancellationToken);
        return Results.Ok(history);
    }

    private static async Task<IResult> ConvertToInvoiceAsync(
        Guid id,
        ClaimsPrincipal user,
        IEstimateService estimateService,
        CancellationToken cancellationToken)
    {
        var invoiceId = await estimateService.ConvertToInvoiceAsync(UserId(user), id, cancellationToken);
        return Results.Ok(new { invoiceId });
    }

    private static Guid UserId(ClaimsPrincipal user) => Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
