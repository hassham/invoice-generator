using System.Security.Claims;
using InvoiceApp.Application.Exceptions;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace InvoiceApp.Api.Diagnostics;

/// <summary>
/// Central exception handling per docs/SAD.md section 81: maps known exception types to HTTP
/// status codes and always logs the full exception server-side (correlation-scoped, via the
/// middleware this runs behind). The client response never includes an internal exception's
/// message or stack trace - only typed, developer-authored Application exceptions (whose messages
/// are written to be client-safe) contribute a "detail" value; anything else gets a generic
/// message and only the correlation ID, so a caller can reference it when asking for help without
/// the response ever disclosing sensitive values (IG-82 completion criteria).
/// </summary>
public sealed class GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        var (statusCode, title, detail) = Map(exception);

        // IG-70 / FSD section 88: a NotFoundException here is indistinguishable from a genuine
        // "doesn't exist" case by design (the anti-enumeration precedent used throughout every
        // *Service.FindOwnedAsync/LoadOwnedAsync) - the HTTP response must stay uninformative
        // either way. This log entry isn't part of that response, though: recording which
        // authenticated account triggered a 401/403/404 gives operators something to actually
        // look at for abuse/compromise patterns, without weakening anti-enumeration on the wire.
        var userId = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
        logger.LogError(
            exception,
            "Unhandled exception mapped to {StatusCode} for {RequestMethod} {RequestPath} (UserId: {UserId})",
            statusCode,
            httpContext.Request.Method,
            httpContext.Request.Path,
            userId ?? "anonymous");

        httpContext.Response.StatusCode = statusCode;

        await httpContext.Response.WriteAsJsonAsync(
            new ProblemDetails
            {
                Status = statusCode,
                Title = title,
                Detail = detail,
                Extensions = { ["correlationId"] = httpContext.TraceIdentifier },
            },
            cancellationToken);

        return true;
    }

    public static (int StatusCode, string Title, string? Detail) Map(Exception exception) => exception switch
    {
        ValidationException => (StatusCodes.Status400BadRequest, "Validation failed.", exception.Message),
        NotFoundException => (StatusCodes.Status404NotFound, "Resource not found.", exception.Message),
        ConflictException => (StatusCodes.Status409Conflict, "Conflict.", exception.Message),
        UnauthorizedException => (StatusCodes.Status401Unauthorized, "Unauthorized.", exception.Message),
        _ => (StatusCodes.Status500InternalServerError, "An unexpected error occurred.", null),
    };
}
