namespace InvoiceApp.Application.Businesses;

/// <summary>All methods resolve the account's one Business row from <paramref name="userId"/>
/// internally, same precedent as ICustomerService/IInvoiceService - never a caller-supplied id.</summary>
public interface IBusinessService
{
    Task<BusinessProfileDto> GetAsync(Guid userId, CancellationToken cancellationToken);

    Task<BusinessProfileDto> UpdateAsync(Guid userId, BusinessProfileRequest request, CancellationToken cancellationToken);

    /// <summary>IG-54 / FSD section 64: formats the account's current InvoicePrefix/
    /// NextInvoiceNumber/InvoiceNumberPadding into a suggested invoice number, then increments
    /// NextInvoiceNumber so the next call/generation produces a different one.</summary>
    Task<GeneratedInvoiceNumberDto> GenerateNextInvoiceNumberAsync(Guid userId, CancellationToken cancellationToken);

    /// <summary>IG-220: same atomic UPDATE...RETURNING pattern as GenerateNextInvoiceNumberAsync,
    /// against EstimatePrefix/NextEstimateNumber/EstimateNumberPadding instead - a completely
    /// independent sequence, never shared with invoice numbering.</summary>
    Task<GeneratedEstimateNumberDto> GenerateNextEstimateNumberAsync(Guid userId, CancellationToken cancellationToken);

    /// <summary>IG-52 / FSD section 14: caller (InvoiceApp.Api) is responsible for validating
    /// <paramref name="content"/> via BusinessLogoValidator before calling this - same convention
    /// as UpdateAsync's BusinessProfileRequestValidator call happening in the endpoint layer, not
    /// here.</summary>
    Task<BusinessProfileDto> UploadLogoAsync(Guid userId, Stream content, string contentType, CancellationToken cancellationToken);

    Task<BusinessProfileDto> RemoveLogoAsync(Guid userId, CancellationToken cancellationToken);

    /// <summary>IG-219: persists the connected account id (already exchanged/verified by
    /// IStripeConnectService before this is called - same "parse-then-delegate" split as
    /// ExternalLoginService/IExternalLoginService).</summary>
    Task<BusinessProfileDto> ConnectStripeAsync(Guid userId, string stripeAccountId, CancellationToken cancellationToken);

    /// <summary>IG-219: caller (InvoiceApp.Api) is responsible for calling
    /// IStripeConnectService.DeauthorizeAsync first - this only ever forgets the id locally.</summary>
    Task<BusinessProfileDto> DisconnectStripeAsync(Guid userId, CancellationToken cancellationToken);
}
