namespace InvoiceApp.Application.Identity;

public interface IPasswordResetService
{
    Task RequestResetAsync(string email, CancellationToken cancellationToken);

    Task ResetPasswordAsync(ResetPasswordRequest request, CancellationToken cancellationToken);
}
