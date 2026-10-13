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

    /// <summary>IG-246: random token embedded as the tracking pixel's address in this email. Only the
    /// pixel knows it, and it reveals nothing but an open. Null for logs written before tracking existed.</summary>
    public string? OpenToken { get; set; }

    /// <summary>IG-246: when the email's pixel first loaded. Null means not opened yet, or never opened - a
    /// mail client that blocks images never loads it, so null does not prove the email went unread.</summary>
    public DateTimeOffset? FirstOpenedAt { get; set; }

    /// <summary>IG-246: how many times the pixel loaded. Image caching and repeat views can make this higher
    /// than the number of people who read the email.</summary>
    public int OpenCount { get; set; }
}
