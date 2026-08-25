namespace InvoiceApp.Application.Identity;

public sealed record ExternalLoginRequest(
    string Provider,
    string ProviderKey,
    string? Email,
    string? Name,
    bool EmailVerified);
