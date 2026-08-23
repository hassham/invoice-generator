namespace InvoiceApp.Application.Exceptions;

/// <summary>
/// Thrown when credentials or a session are invalid (e.g. FSD 8's login failure). The message is
/// safe to return to the client and must already be generic - callers must not distinguish
/// "account not found" from "wrong password" in what they pass here (FSD 8: do not expose
/// whether a particular email exists).
/// </summary>
public sealed class UnauthorizedException(string message) : Exception(message);
