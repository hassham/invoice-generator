using System.Security.Claims;
using InvoiceApp.Application.Customers;
using InvoiceApp.Modules.Customers;

namespace InvoiceApp.Api.Endpoints;

public static class CustomerEndpoints
{
    public static IEndpointRouteBuilder MapCustomerEndpoints(this IEndpointRouteBuilder app)
    {
        // All account-owned (FSD section 93 / IG-55 AC) - every route requires a session, unlike
        // the anonymous-reachable /invoices/calculate and /templates endpoints.
        app.MapGet("/api/v1/customers", ListAsync).RequireAuthorization();
        app.MapGet("/api/v1/customers/{id:guid}", GetAsync).RequireAuthorization();
        app.MapPost("/api/v1/customers", CreateAsync).RequireAuthorization();
        app.MapPut("/api/v1/customers/{id:guid}", UpdateAsync).RequireAuthorization();
        app.MapDelete("/api/v1/customers/{id:guid}", ArchiveAsync).RequireAuthorization();
        return app;
    }

    private static async Task<IResult> ListAsync(
        ClaimsPrincipal user,
        ICustomerService customerService,
        CancellationToken cancellationToken,
        bool includeArchived = false)
    {
        var customers = await customerService.ListAsync(UserId(user), includeArchived, cancellationToken);
        return Results.Ok(customers);
    }

    private static async Task<IResult> GetAsync(
        Guid id,
        ClaimsPrincipal user,
        ICustomerService customerService,
        CancellationToken cancellationToken)
    {
        var customer = await customerService.GetAsync(UserId(user), id, cancellationToken);
        return Results.Ok(customer);
    }

    private static async Task<IResult> CreateAsync(
        CustomerRequest request,
        ClaimsPrincipal user,
        ICustomerService customerService,
        CancellationToken cancellationToken)
    {
        CustomerRequestValidator.Validate(request);

        var customer = await customerService.CreateAsync(UserId(user), request, cancellationToken);
        return Results.Created($"/api/v1/customers/{customer.Id}", customer);
    }

    private static async Task<IResult> UpdateAsync(
        Guid id,
        CustomerRequest request,
        ClaimsPrincipal user,
        ICustomerService customerService,
        CancellationToken cancellationToken)
    {
        CustomerRequestValidator.Validate(request);

        var customer = await customerService.UpdateAsync(UserId(user), id, request, cancellationToken);
        return Results.Ok(customer);
    }

    private static async Task<IResult> ArchiveAsync(
        Guid id,
        ClaimsPrincipal user,
        ICustomerService customerService,
        CancellationToken cancellationToken)
    {
        await customerService.ArchiveAsync(UserId(user), id, cancellationToken);
        return Results.NoContent();
    }

    private static Guid UserId(ClaimsPrincipal user) => Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
