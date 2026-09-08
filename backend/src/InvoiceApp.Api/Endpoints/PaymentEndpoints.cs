using System.Security.Claims;
using InvoiceApp.Application.Payments;
using InvoiceApp.Modules.Payments;

namespace InvoiceApp.Api.Endpoints;

public static class PaymentEndpoints
{
    public static IEndpointRouteBuilder MapPaymentEndpoints(this IEndpointRouteBuilder app)
    {
        // Sub-resource of an account-owned invoice (FSD sections 66-72) - every route requires a
        // session, same convention as CustomerEndpoints/CatalogEndpoints.
        app.MapGet("/api/v1/invoices/{invoiceId:guid}/payments", ListAsync).RequireAuthorization();
        app.MapPost("/api/v1/invoices/{invoiceId:guid}/payments", RecordAsync).RequireAuthorization();
        app.MapDelete("/api/v1/invoices/{invoiceId:guid}/payments/{paymentId:guid}", RemoveAsync).RequireAuthorization();
        return app;
    }

    private static async Task<IResult> ListAsync(
        Guid invoiceId,
        ClaimsPrincipal user,
        IPaymentService paymentService,
        CancellationToken cancellationToken)
    {
        var payments = await paymentService.ListAsync(UserId(user), invoiceId, cancellationToken);
        return Results.Ok(payments);
    }

    private static async Task<IResult> RecordAsync(
        Guid invoiceId,
        PaymentRequest request,
        ClaimsPrincipal user,
        IPaymentService paymentService,
        CancellationToken cancellationToken)
    {
        PaymentRequestValidator.Validate(request);

        var result = await paymentService.RecordAsync(UserId(user), invoiceId, request, cancellationToken);
        return Results.Created($"/api/v1/invoices/{invoiceId}/payments/{result.Payment.Id}", result);
    }

    private static async Task<IResult> RemoveAsync(
        Guid invoiceId,
        Guid paymentId,
        ClaimsPrincipal user,
        IPaymentService paymentService,
        CancellationToken cancellationToken)
    {
        var invoice = await paymentService.RemoveAsync(UserId(user), invoiceId, paymentId, cancellationToken);
        return Results.Ok(invoice);
    }

    private static Guid UserId(ClaimsPrincipal user) => Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
