namespace InvoiceApp.Domain.Invoicing;

/// <summary>IG-213: one row per send attempt (both a successful send and a failed one are
/// recorded - a failed attempt is still something the user needs visibility into, not just a
/// silent gap in the history). "Opened" tracking is explicitly out of scope for this pass (see the
/// Jira comment on IG-213) - no column exists for it.</summary>
public sealed class InvoiceEmailLog
{
    public Guid Id { get; set; }

    public Guid InvoiceId { get; set; }

    public DateTimeOffset SentAt { get; set; }

    /// <summary>jsonb array of recipient addresses - same "structured list, not a delimited
    /// string" convention as everywhere else in this codebase that stores a JSON blob
    /// (CustomerSnapshot/SellerSnapshot).</summary>
    public string To { get; set; } = string.Empty;

    public string Cc { get; set; } = string.Empty;

    public string Subject { get; set; } = string.Empty;

    public InvoiceEmailStatus Status { get; set; }

    /// <summary>Only set when Status is Failed - never rendered to the end user as-is (an
    /// exception's raw message isn't guaranteed client-safe), but useful for the account owner to
    /// see roughly why, and for support/debugging.</summary>
    public string? ErrorMessage { get; set; }
}
