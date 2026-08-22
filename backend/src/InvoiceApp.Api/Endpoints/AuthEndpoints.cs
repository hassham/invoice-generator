using InvoiceApp.Application.Identity;
using InvoiceApp.Modules.Identity.Registration;

namespace InvoiceApp.Api.Endpoints;

public static class AuthEndpoints
{
    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/v1/auth/register", RegisterAsync);
        return app;
    }

    private static async Task<IResult> RegisterAsync(
        RegisterAccountRequest request,
        IAccountRegistrationService registrationService,
        IAuthSessionService authSessionService,
        CancellationToken cancellationToken)
    {
        RegistrationRequestValidator.Validate(request);

        var registered = await registrationService.RegisterAsync(request, cancellationToken);
        await authSessionService.SignInAsync(registered.UserId, cancellationToken);

        return Results.Ok(new RegisterResponse(registered.UserId, request.Email, request.Name, registered.BusinessId));
    }
}

public sealed record RegisterResponse(Guid UserId, string Email, string? Name, Guid BusinessId);
