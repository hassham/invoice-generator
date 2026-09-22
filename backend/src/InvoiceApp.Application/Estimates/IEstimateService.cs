using InvoiceApp.Application.Documents;
using InvoiceApp.Application.Invoicing;
using InvoiceApp.Domain.Invoicing;

namespace InvoiceApp.Application.Estimates;

/// <summary>
/// IG-220: one upsert method backs both POST (create, estimateId null) and PUT (update, estimateId
/// set) - same pattern as IInvoiceService.SaveAsync. Account ownership is enforced internally from
/// userId - a caller can never save under, or overwrite, another account's estimate. IG-221 adds
/// email sending/hosted-page access, reusing InvoiceEmailRequest/InvoiceEmailStatus/
/// InvoiceEmailLogDto/InvoiceEmailContext directly (all already fully generic - no
/// EstimateEmailRequest etc. needed). IG-222 adds the customer-facing Accept/Decline action on the
/// hosted page. Cancel/Delete/Duplicate/Convert are deliberately still out of scope (later Stories
/// in Epic IG-207).
/// </summary>
public interface IEstimateService
{
    Task<EstimateDto> SaveAsync(Guid userId, Guid? estimateId, EstimateSaveRequest request, CancellationToken cancellationToken);

    Task<EstimateDetailDto> GetAsync(Guid userId, Guid estimateId, CancellationToken cancellationToken);

    Task<EstimateListResponse> ListAsync(Guid userId, EstimateListQuery query, CancellationToken cancellationToken);

    /// <summary>IG-221: anonymous, token-keyed - same precedent as
    /// IInvoiceService.GetHostedInvoiceAsync.</summary>
    Task<HostedEstimateDto> GetHostedEstimateAsync(string token, CancellationToken cancellationToken);

    /// <summary>IG-221's "Download PDF" action on the hosted page - same anonymous, token-keyed
    /// access as GetHostedEstimateAsync.</summary>
    Task<InvoicePdfRequest> BuildHostedEstimatePdfRequestAsync(string token, CancellationToken cancellationToken);

    /// <summary>IG-221: account-owned - assembles everything needed to send the estimate by email,
    /// generating its public token now if it doesn't have one yet (estimates aren't tokened at
    /// creation - IG-220 shipped before this Story existed - so this is the first point one is
    /// needed). Does not itself render the PDF or send the email - same split as
    /// IInvoiceService.PrepareInvoiceEmailAsync.</summary>
    Task<InvoiceEmailContext> PrepareEstimateEmailAsync(Guid userId, Guid estimateId, CancellationToken cancellationToken);

    /// <summary>IG-221/262: records one send attempt, successful or not. A successful send
    /// (status Sent) also transitions the estimate's own Status to Sent, but only the first time -
    /// idempotent, and never regresses an estimate already Accepted/Declined/Converted back to
    /// Sent. A failed attempt is still recorded (visibility for the account owner) but never
    /// transitions status.</summary>
    Task RecordEstimateEmailSentAsync(Guid userId, Guid estimateId, InvoiceEmailRequest request, InvoiceEmailStatus status, string? errorMessage, CancellationToken cancellationToken);

    /// <summary>IG-221/262: newest first, account-owned - same precedent as
    /// IInvoiceService.GetEmailHistoryAsync.</summary>
    Task<IReadOnlyList<InvoiceEmailLogDto>> GetEstimateEmailHistoryAsync(Guid userId, Guid estimateId, CancellationToken cancellationToken);

    /// <summary>IG-222: anonymous, token-keyed - the customer's Accept action on the hosted page.
    /// Only valid from Sent; already-Accepted is idempotent (returns the current state rather than
    /// erroring, so a double-click or page refresh after accepting is harmless); Declined/Converted/
    /// Draft all reject with a client-safe ConflictException explaining why.</summary>
    Task<HostedEstimateDto> AcceptEstimateAsync(string token, CancellationToken cancellationToken);

    /// <summary>IG-222: the customer's Decline action - same token-keyed, idempotent-on-repeat
    /// shape as AcceptEstimateAsync, just the mirror-image transition and conflict messages.</summary>
    Task<HostedEstimateDto> DeclineEstimateAsync(string token, CancellationToken cancellationToken);

    /// <summary>IG-223: authenticated, account-owned - convert an Accepted estimate into a new
    /// invoice. Reuses the entire invoice creation/calculation pipeline; the new invoice starts
    /// as Draft with all line items, totals, and customer data copied from the estimate.
    /// Estimate status transitions to Converted. Only valid from Accepted; Sent/Declined/Draft/
    /// Converted all reject with a client-safe ConflictException.</summary>
    Task<Guid> ConvertToInvoiceAsync(Guid userId, Guid estimateId, CancellationToken cancellationToken);
}
