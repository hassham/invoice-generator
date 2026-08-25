namespace InvoiceApp.Application.Identity;

public sealed record ResetPasswordRequest(string Email, string Token, string NewPassword, string ConfirmPassword);
