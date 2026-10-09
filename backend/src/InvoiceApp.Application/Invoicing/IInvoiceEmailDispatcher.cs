namespace InvoiceApp.Application.Invoicing;

/// <summary>
/// IG-311: sends a saved invoice to its recipients, exactly as the send-email endpoint does —
/// hosted link, PDF attachment, email history entry and all.
///
/// This exists as an Application-level port because the recurring generation job needs to send an
/// invoice when a schedule has Automatic Send on, and that job lives in Infrastructure, which may
/// not reference <c>InvoiceApp.Modules.Documents</c> (the PDF renderer) or
/// <c>InvoiceApp.Modules.Invoicing</c> (the message builder) — the project-reference boundary in
/// docs/SAD.md §26-27, enforced by ModuleReferenceBoundaryTests.
///
/// The implementation lives in the Api composition root, the one project allowed to see all of
/// those pieces. Both the endpoint and the background job go through it, so an automatically sent
/// invoice is identical to a manually sent one rather than a second, slightly different email.
/// </summary>
public interface IInvoiceEmailDispatcher
{
    Task SendAsync(Guid userId, Guid invoiceId, InvoiceEmailRequest request, CancellationToken cancellationToken);
}
