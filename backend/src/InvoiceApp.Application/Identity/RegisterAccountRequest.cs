namespace InvoiceApp.Application.Identity;

public sealed record RegisterAccountRequest(string Email, string Password, string ConfirmPassword, string? Name);
