using InvoiceApp.Application.Payments;

namespace InvoiceApp.Api.Tests.Payments;

/// <summary>
/// Stands in for the real Stripe.net signature verification IStripeWebhookService would otherwise
/// perform - HTTP-pipeline tests need a deterministic, network/crypto-free result to assert
/// against. The real verification logic itself (StripeWebhookService) is covered by its own real,
/// genuinely-signed unit tests in InvoiceApp.Infrastructure.Tests - this fake only stands in at the
/// endpoint-wiring layer.
/// </summary>
public sealed class FakeStripeWebhookService : IStripeWebhookService
{
    public StripeWebhookParseResult ResultToReturn { get; set; } = new(true, null, null, false, null);

    public List<(string Payload, string SignatureHeader)> ReceivedCalls { get; } = [];

    public StripeWebhookParseResult ParseEvent(string payload, string signatureHeader)
    {
        ReceivedCalls.Add((payload, signatureHeader));
        return ResultToReturn;
    }
}
