using InvoiceApp.Application.Invoicing;
using InvoiceApp.Modules.Invoicing.Calculations;

namespace InvoiceApp.Api.Endpoints;

public static class InvoiceEndpoints
{
    public static IEndpointRouteBuilder MapInvoiceEndpoints(this IEndpointRouteBuilder app)
    {
        // No [RequireAuthorization]: anonymous invoice creation is a first-class scenario
        // (FSD section 10.1's /invoice/create route, Epic IG-4) - this endpoint is stateless and
        // reads nothing account-specific, so there's no reason to gate it behind a session.
        app.MapPost("/api/v1/invoices/calculate", Calculate);
        return app;
    }

    private static IResult Calculate(InvoiceCalculationRequest request)
    {
        InvoiceCalculationRequestValidator.Validate(request);

        var result = InvoiceCalculator.Calculate(request);

        return Results.Ok(result);
    }
}
