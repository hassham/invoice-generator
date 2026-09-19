using System.Security.Cryptography;
using System.Text;
using InvoiceApp.Infrastructure.Configuration;
using InvoiceApp.Infrastructure.Payments;
using Microsoft.Extensions.Options;

namespace InvoiceApp.Infrastructure.Tests.Payments;

/// <summary>IG-217 AC: "Webhook signature is verified before the event is trusted." Builds a
/// genuinely HMAC-signed payload per Stripe's own documented scheme (signed_payload =
/// "{timestamp}.{payload}", HMAC-SHA256 with the endpoint secret) and exercises the real
/// Stripe.net EventUtility.ConstructEvent call - not a fake - to prove this app's actual
/// verification wiring rejects/accepts correctly, not just that a mock says so.</summary>
public class StripeWebhookServiceTests
{
    private const string Secret = "whsec_test_secret_12345";

    private static string SignPayload(string payload, string secret, long? timestampOverride = null)
    {
        var timestamp = timestampOverride ?? DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var signedPayload = $"{timestamp}.{payload}";
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(signedPayload));
        var signature = Convert.ToHexString(hash).ToLowerInvariant();
        return $"t={timestamp},v1={signature}";
    }

    private static string BuildCheckoutSessionCompletedPayload(string sessionId, string publicToken, string paymentStatus, long amountTotal, string currency = "aud") => $$"""
        {
          "id": "evt_test_123",
          "object": "event",
          "type": "checkout.session.completed",
          "data": {
            "object": {
              "id": "{{sessionId}}",
              "object": "checkout.session",
              "payment_status": "{{paymentStatus}}",
              "amount_total": {{amountTotal}},
              "currency": "{{currency}}",
              "metadata": { "publicToken": "{{publicToken}}" }
            }
          }
        }
        """;

    private static StripeWebhookService CreateService(string secret = Secret) =>
        new(Options.Create(new StripeOptions { ConnectWebhookSecret = secret }));

    [Fact]
    public void A_validly_signed_paid_checkout_session_event_is_accepted_and_parsed()
    {
        var payload = BuildCheckoutSessionCompletedPayload("cs_test_1", "tokenABC", "paid", 20900);
        var signature = SignPayload(payload, Secret);

        var result = CreateService().ParseEvent(payload, signature);

        Assert.True(result.IsValid);
        Assert.Equal("cs_test_1", result.SessionId);
        Assert.Equal("tokenABC", result.PublicTokenMetadata);
        Assert.True(result.IsPaid);
        Assert.Equal(209m, result.AmountTotal);
    }

    [Fact]
    public void An_unpaid_session_event_is_still_validly_parsed_but_not_marked_paid()
    {
        var payload = BuildCheckoutSessionCompletedPayload("cs_test_2", "tokenABC", "unpaid", 20900);
        var signature = SignPayload(payload, Secret);

        var result = CreateService().ParseEvent(payload, signature);

        Assert.True(result.IsValid);
        Assert.False(result.IsPaid);
    }

    [Fact]
    public void A_tampered_payload_fails_signature_verification()
    {
        var payload = BuildCheckoutSessionCompletedPayload("cs_test_3", "tokenABC", "paid", 20900);
        var signature = SignPayload(payload, Secret);
        var tamperedPayload = BuildCheckoutSessionCompletedPayload("cs_test_3", "tokenABC", "paid", 99999);

        var result = CreateService().ParseEvent(tamperedPayload, signature);

        Assert.False(result.IsValid);
        Assert.Null(result.SessionId);
    }

    [Fact]
    public void A_signature_produced_with_the_wrong_secret_is_rejected()
    {
        var payload = BuildCheckoutSessionCompletedPayload("cs_test_4", "tokenABC", "paid", 20900);
        var signature = SignPayload(payload, "whsec_a_completely_different_secret");

        var result = CreateService().ParseEvent(payload, signature);

        Assert.False(result.IsValid);
    }

    [Fact]
    public void A_missing_signature_header_is_rejected()
    {
        var payload = BuildCheckoutSessionCompletedPayload("cs_test_5", "tokenABC", "paid", 20900);

        var result = CreateService().ParseEvent(payload, string.Empty);

        Assert.False(result.IsValid);
    }

    [Fact]
    public void An_irrelevant_event_type_is_valid_but_carries_no_session_data()
    {
        const string payload = """{"id": "evt_test_999", "object": "event", "type": "customer.created", "data": { "object": { "id": "cus_test_1", "object": "customer" } } }""";
        var signature = SignPayload(payload, Secret);

        var result = CreateService().ParseEvent(payload, signature);

        Assert.True(result.IsValid);
        Assert.Null(result.SessionId);
        Assert.False(result.IsPaid);
    }
}
