namespace InvoiceApp.Application.Exceptions;

/// <summary>
/// Thrown by use-case code when input fails validation. The message is written for the caller
/// (e.g. "Email is required") and is safe to return to the client - see
/// InvoiceApp.Api.Diagnostics.GlobalExceptionHandler.
/// </summary>
public sealed class ValidationException(string message) : Exception(message);
