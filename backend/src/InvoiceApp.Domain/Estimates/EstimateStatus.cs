namespace InvoiceApp.Domain.Estimates;

/// <summary>IG-220 AC: an estimate's own status lifecycle - deliberately not InvoiceStatus (no
/// payment concepts apply to an estimate at all). Sent/Accepted/Declined are assigned by later
/// Stories (IG-221 send, IG-222 accept/decline) - only Draft is reachable today. Converted is set
/// by IG-223 once an accepted estimate becomes an invoice.</summary>
public enum EstimateStatus
{
    Draft,
    Sent,
    Accepted,
    Declined,
    Converted,
}
