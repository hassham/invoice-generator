namespace InvoiceApp.Application.Identity;

public sealed record LoggedInAccount(Guid UserId, string Email, string? Name);
