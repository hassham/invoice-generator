using InvoiceApp.Application.Documents;
using InvoiceApp.Domain.Invoicing;

namespace InvoiceApp.Application.Invoicing;

/// <summary>
/// One upsert method backs both POST (create, invoiceId null) and PUT (update, invoiceId set) -
/// same request shape either way (IG-45 AC: "Manual save stores a valid account-owned invoice").
/// Account ownership is enforced internally from userId, same precedent as ICustomerService - a
/// caller can never save under, or overwrite, another account's invoice.
/// </summary>
public interface IInvoiceService
{
    Task<InvoiceDto> SaveAsync(Guid userId, Guid? invoiceId, InvoiceSaveRequest request, CancellationToken cancellationToken);

    Task<InvoiceDetailDto> GetAsync(Guid userId, Guid invoiceId, CancellationToken cancellationToken);

    Task<InvoiceListResponse> ListAsync(Guid userId, InvoiceListQuery query, CancellationToken cancellationToken);

    /// <summary>FSD section 52: idempotent (cancelling an already-cancelled invoice is a no-op,
    /// same precedent as ICustomerService.ArchiveAsync) - but throws ConflictException for a Paid
    /// invoice, since there's no reversal mechanic (Epic IG-11) to un-do the money already
    /// received.</summary>
    Task<InvoiceDto> CancelAsync(Guid userId, Guid invoiceId, CancellationToken cancellationToken);

    /// <summary>FSD section 53: always a soft delete (IsDeleted/DeletedAt), regardless of status -
    /// "prefer soft deletion... do not permanently remove financial history" applied uniformly
    /// rather than branching a real hard-delete path this codebase has never had.</summary>
    Task DeleteAsync(Guid userId, Guid invoiceId, CancellationToken cancellationToken);

    /// <summary>FSD section 51: creates a new Draft invoice copying Customer/Items/Tax
    /// settings/Notes/Terms/Template - never Invoice Number, Reference, Payments, or Status.</summary>
    Task<InvoiceDto> DuplicateAsync(Guid userId, Guid invoiceId, CancellationToken cancellationToken);

    /// <summary>IG-214: anonymous, keyed by the invoice's public token rather than a userId/session
    /// - see HostedInvoiceDto's own doc comment for why this is a narrower projection than
    /// InvoiceDetailDto.</summary>
    Task<HostedInvoiceDto> GetHostedInvoiceAsync(string token, CancellationToken cancellationToken);

    /// <summary>IG-214's "Download PDF" action - same anonymous, token-keyed access as
    /// GetHostedInvoiceAsync.</summary>
    Task<InvoicePdfRequest> BuildHostedInvoicePdfRequestAsync(string token, CancellationToken cancellationToken);

    /// <summary>IG-212: account-owned (same LoadOwnedAsync ownership check as every other
    /// authenticated method here) - assembles everything needed to send the invoice by email,
    /// generating its public token now if it somehow doesn't have one yet (an invoice saved before
    /// this feature existed - see Invoice.PublicToken's own doc comment on why that's possible).
    /// Does not itself render the PDF or send the email - QuestPDF rendering and SMTP delivery are
    /// both endpoint-layer concerns (see InvoiceEndpoints.SendEmailAsync), matching how
    /// BuildHostedInvoicePdfRequestAsync already keeps this service QuestPDF-agnostic.</summary>
    Task<InvoiceEmailContext> PrepareInvoiceEmailAsync(Guid userId, Guid invoiceId, CancellationToken cancellationToken);

    /// <summary>IG-213: records one send attempt, successful or not - called by
    /// InvoiceEndpoints.SendEmailAsync after it actually attempts delivery via IEmailSender, since
    /// only that layer knows whether the attempt succeeded.</summary>
    Task RecordEmailSentAsync(Guid userId, Guid invoiceId, InvoiceEmailRequest request, InvoiceEmailStatus status, string? errorMessage, CancellationToken cancellationToken);

    /// <summary>IG-213: newest first, account-owned.</summary>
    Task<IReadOnlyList<InvoiceEmailLogDto>> GetEmailHistoryAsync(Guid userId, Guid invoiceId, CancellationToken cancellationToken);
}
