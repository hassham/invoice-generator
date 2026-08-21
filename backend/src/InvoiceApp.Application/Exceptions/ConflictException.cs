namespace InvoiceApp.Application.Exceptions;

/// <summary>
/// Thrown by use-case code when a request conflicts with current state (e.g. a duplicate invoice
/// number - docs/FSD.md section 65). The message is safe to return to the client.
/// </summary>
public sealed class ConflictException(string message) : Exception(message);
