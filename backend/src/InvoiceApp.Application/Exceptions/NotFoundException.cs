namespace InvoiceApp.Application.Exceptions;

/// <summary>
/// Thrown by use-case code when a requested entity does not exist, or (per docs/SAD.md section 88
/// - authorisation must never confirm existence to a caller who doesn't own the resource) when it
/// exists but belongs to a different business/user. The message is safe to return to the client.
/// </summary>
public sealed class NotFoundException(string message) : Exception(message);
