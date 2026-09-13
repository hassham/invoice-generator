using InvoiceApp.Domain.Invoicing;

namespace InvoiceApp.Application.Invoicing;

/// <summary>IG-213: deliberately narrower than InvoiceEmailLog itself - ErrorMessage stays
/// server-side (an exception's raw message isn't guaranteed client-safe), matching this codebase's
/// general "entity has more than its DTO exposes" precedent.</summary>
public sealed record InvoiceEmailLogDto(
    Guid Id,
    DateTimeOffset SentAt,
    IReadOnlyList<string> To,
    IReadOnlyList<string> Cc,
    string Subject,
    InvoiceEmailStatus Status);
