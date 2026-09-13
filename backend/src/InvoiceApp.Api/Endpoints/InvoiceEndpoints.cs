using System.Security.Claims;
using InvoiceApp.Application.Email;
using InvoiceApp.Application.Invoicing;
using InvoiceApp.Domain.Invoicing;
using InvoiceApp.Infrastructure.Configuration;
using InvoiceApp.Modules.Documents.Pdf;
using InvoiceApp.Modules.Invoicing;
using QuestPDF.Fluent;

namespace InvoiceApp.Api.Endpoints;

public static class InvoiceEndpoints
{
    public static IEndpointRouteBuilder MapInvoiceEndpoints(this IEndpointRouteBuilder app)
    {
        // No [RequireAuthorization]: anonymous invoice creation is a first-class scenario
        // (FSD section 10.1's /invoice/create route, Epic IG-4) - this endpoint is stateless and
        // reads nothing account-specific, so there's no reason to gate it behind a session.
        app.MapPost("/api/v1/invoices/calculate", Calculate);

        // IG-45/IG-47/IG-62: "As an authenticated user..." - unlike /calculate and /pdf above,
        // these all read or write account-owned data, so all require a session.
        app.MapPost("/api/v1/invoices", CreateAsync).RequireAuthorization();
        app.MapPut("/api/v1/invoices/{id:guid}", UpdateAsync).RequireAuthorization();
        app.MapGet("/api/v1/invoices/{id:guid}", GetAsync).RequireAuthorization();
        app.MapGet("/api/v1/invoices", ListAsync).RequireAuthorization();
        // IG-49: same DELETE-archives-not-hard-deletes convention as CustomerEndpoints.
        app.MapPost("/api/v1/invoices/{id:guid}/cancel", CancelAsync).RequireAuthorization();
        app.MapDelete("/api/v1/invoices/{id:guid}", DeleteAsync).RequireAuthorization();
        app.MapPost("/api/v1/invoices/{id:guid}/duplicate", DuplicateAsync).RequireAuthorization();
        // IG-212: authenticated (unlike the anonymous PDF endpoint) since it has a real external
        // side effect - an actual email sent to a caller-supplied address - and rate-limited on
        // top of that for the same "sensitive/expensive endpoint" reasoning IG-71 already
        // established, since an authenticated account could otherwise be used to relay spam to
        // arbitrary recipients at volume.
        app.MapPost("/api/v1/invoices/{id:guid}/send-email", SendEmailAsync).RequireAuthorization().RequireRateLimiting(RateLimitingOptions.AuthPolicyName);
        // IG-213: a plain read, no rate limiting needed beyond what authentication already implies.
        app.MapGet("/api/v1/invoices/{id:guid}/email-history", GetEmailHistoryAsync).RequireAuthorization();
        return app;
    }

    private static IResult Calculate(InvoiceCalculationRequest request)
    {
        InvoiceCalculationRequestValidator.Validate(request);

        var result = InvoiceCalculator.Calculate(request);

        return Results.Ok(result);
    }

    private static async Task<IResult> CreateAsync(
        InvoiceSaveRequest request,
        ClaimsPrincipal user,
        IInvoiceService invoiceService,
        CancellationToken cancellationToken)
    {
        InvoiceSaveRequestValidator.Validate(request);

        var invoice = await invoiceService.SaveAsync(UserId(user), invoiceId: null, request, cancellationToken);
        return Results.Created($"/api/v1/invoices/{invoice.Id}", invoice);
    }

    private static async Task<IResult> UpdateAsync(
        Guid id,
        InvoiceSaveRequest request,
        ClaimsPrincipal user,
        IInvoiceService invoiceService,
        CancellationToken cancellationToken)
    {
        InvoiceSaveRequestValidator.Validate(request);

        var invoice = await invoiceService.SaveAsync(UserId(user), id, request, cancellationToken);
        return Results.Ok(invoice);
    }

    private static async Task<IResult> GetAsync(
        Guid id,
        ClaimsPrincipal user,
        IInvoiceService invoiceService,
        CancellationToken cancellationToken)
    {
        var invoice = await invoiceService.GetAsync(UserId(user), id, cancellationToken);
        return Results.Ok(invoice);
    }

    private static async Task<IResult> ListAsync(
        ClaimsPrincipal user,
        IInvoiceService invoiceService,
        CancellationToken cancellationToken,
        int page = 1,
        int pageSize = 25,
        string? search = null,
        InvoiceStatus? status = null,
        DateOnly? startDate = null,
        DateOnly? endDate = null,
        Guid? customerId = null,
        InvoiceSortOption sort = InvoiceSortOption.Newest)
    {
        var query = new InvoiceListQuery(page, pageSize, search, status, startDate, endDate, customerId, sort);
        var result = await invoiceService.ListAsync(UserId(user), query, cancellationToken);
        return Results.Ok(result);
    }

    private static async Task<IResult> CancelAsync(
        Guid id,
        ClaimsPrincipal user,
        IInvoiceService invoiceService,
        CancellationToken cancellationToken)
    {
        var invoice = await invoiceService.CancelAsync(UserId(user), id, cancellationToken);
        return Results.Ok(invoice);
    }

    private static async Task<IResult> DeleteAsync(
        Guid id,
        ClaimsPrincipal user,
        IInvoiceService invoiceService,
        CancellationToken cancellationToken)
    {
        await invoiceService.DeleteAsync(UserId(user), id, cancellationToken);
        return Results.NoContent();
    }

    private static async Task<IResult> DuplicateAsync(
        Guid id,
        ClaimsPrincipal user,
        IInvoiceService invoiceService,
        CancellationToken cancellationToken)
    {
        var invoice = await invoiceService.DuplicateAsync(UserId(user), id, cancellationToken);
        return Results.Created($"/api/v1/invoices/{invoice.Id}", invoice);
    }

    /// <summary>IG-212: orchestrates what InvoiceService deliberately stays agnostic of - QuestPDF
    /// rendering (same layering as PublicInvoiceEndpoints.GetPdfAsync; InvoiceApp.Infrastructure
    /// has no reference to InvoiceApp.Modules.Documents) and SMTP delivery. IG-213: records the
    /// attempt either way - a failed send is still something the account owner needs visibility
    /// into (RecordEmailSentAsync's own doc comment), so this deliberately doesn't let a delivery
    /// failure skip logging on its way to the global exception handler.</summary>
    private static async Task<IResult> SendEmailAsync(
        Guid id,
        InvoiceEmailRequest request,
        ClaimsPrincipal user,
        IInvoiceService invoiceService,
        IEmailSender emailSender,
        IConfiguration configuration,
        CancellationToken cancellationToken)
    {
        InvoiceEmailRequestValidator.Validate(request);

        var userId = UserId(user);
        var context = await invoiceService.PrepareInvoiceEmailAsync(userId, id, cancellationToken);
        var pdfBytes = new InvoicePdfDocument(context.PdfRequest).GeneratePdf();
        var pdfFileName = InvoiceFilenameGenerator.Generate(context.PdfRequest.InvoiceNumber);
        var frontendBaseUrl = configuration["Frontend:BaseUrl"] ?? "http://localhost:3000";
        var hostedLink = $"{frontendBaseUrl}/i/{context.PublicToken}";
        var message = InvoiceEmailMessageBuilder.Build(request, hostedLink, pdfBytes, pdfFileName, context.BusinessEmail);

        try
        {
            await emailSender.SendAsync(message, cancellationToken);
        }
        catch (Exception ex)
        {
            await invoiceService.RecordEmailSentAsync(userId, id, request, InvoiceEmailStatus.Failed, ex.Message, cancellationToken);
            throw;
        }

        await invoiceService.RecordEmailSentAsync(userId, id, request, InvoiceEmailStatus.Sent, null, cancellationToken);
        return Results.NoContent();
    }

    private static async Task<IResult> GetEmailHistoryAsync(
        Guid id,
        ClaimsPrincipal user,
        IInvoiceService invoiceService,
        CancellationToken cancellationToken)
    {
        var history = await invoiceService.GetEmailHistoryAsync(UserId(user), id, cancellationToken);
        return Results.Ok(history);
    }

    private static Guid UserId(ClaimsPrincipal user) => Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
