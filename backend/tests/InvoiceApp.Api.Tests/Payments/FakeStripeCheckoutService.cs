using InvoiceApp.Application.Payments;

namespace InvoiceApp.Api.Tests.Payments;

/// <summary>
/// Stands in for the real Stripe Checkout API calls IStripeCheckoutService would otherwise make -
/// same reasoning as FakeStripeConnectService. SessionUrlToReturn/SessionIdToReturn default to
/// deterministic values a test can assert against; PaidOverride lets a test control what
/// ConfirmSessionAsync sees back from "Stripe" without a real Checkout Session ever existing.
/// </summary>
public sealed class FakeStripeCheckoutService : IStripeCheckoutService
{
    public string SessionIdToReturn { get; set; } = "cs_test_fake123";

    public string SessionUrlToReturn { get; set; } = "https://checkout.stripe.com/c/pay/cs_test_fake123";

    public List<StripeCheckoutSessionRequest> CreatedSessions { get; } = [];

    /// <summary>Keyed by session id so a test can script different confirmation outcomes (paid,
    /// not paid, wrong invoice) for different sessions in the same run.</summary>
    public Dictionary<string, StripeCheckoutSessionStatus> StatusesBySessionId { get; } = [];

    public Task<StripeCheckoutSessionResult> CreateSessionAsync(StripeCheckoutSessionRequest request, CancellationToken cancellationToken)
    {
        CreatedSessions.Add(request);

        // Default: a status a real successful payment would produce, bound to the same invoice
        // the session was created for - a test overrides this per-session-id when it wants a
        // different outcome (unpaid, wrong-invoice metadata, etc).
        StatusesBySessionId.TryAdd(SessionIdToReturn, new StripeCheckoutSessionStatus(true, request.PublicToken, request.AmountDue));

        return Task.FromResult(new StripeCheckoutSessionResult(SessionIdToReturn, SessionUrlToReturn));
    }

    public Task<StripeCheckoutSessionStatus> GetSessionStatusAsync(string stripeAccountId, string sessionId, CancellationToken cancellationToken) =>
        Task.FromResult(StatusesBySessionId.TryGetValue(sessionId, out var status) ? status : new StripeCheckoutSessionStatus(false, null, null));
}
