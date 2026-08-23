namespace InvoiceApp.Application.Identity;

public sealed record LoginRequest(string Email, string Password, bool RememberMe);
