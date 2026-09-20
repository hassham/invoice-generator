using InvoiceApp.Domain.Invoicing;

namespace InvoiceApp.Domain.Estimates;

/// <summary>IG-221/262: one row per send attempt, mirrors InvoiceEmailLog exactly (reuses
/// InvoiceEmailStatus directly - Sent/Failed is a generic-enough concept that a second identical
/// enum would add nothing).</summary>
public sealed class EstimateEmailLog
{
    public Guid Id { get; set; }

    public Guid EstimateId { get; set; }

    public DateTimeOffset SentAt { get; set; }

    public string To { get; set; } = string.Empty;

    public string Cc { get; set; } = string.Empty;

    public string Subject { get; set; } = string.Empty;

    public InvoiceEmailStatus Status { get; set; }

    public string? ErrorMessage { get; set; }
}
