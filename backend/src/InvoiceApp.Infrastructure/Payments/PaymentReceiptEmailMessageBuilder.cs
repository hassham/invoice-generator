using System.Net;
using InvoiceApp.Application.Email;

namespace InvoiceApp.Infrastructure.Payments;

/// <summary>
/// IG-218: no attachment and no sender-typed free text, unlike InvoiceEmailMessageBuilder (IG-212)
/// - a receipt is a fixed-content confirmation, not a message the business composes. Kept as its
/// own builder rather than extending InvoiceEmailMessageBuilder since the two have no shared
/// inputs beyond "an EmailMessage comes out the other end".
/// </summary>
public static class PaymentReceiptEmailMessageBuilder
{
    public static EmailMessage Build(string payerEmail, string businessName, string invoiceNumber, decimal amountPaid, string currency, string? replyTo)
    {
        var formattedAmount = $"{currency} {amountPaid:0.00}";

        var plainTextBody = $"""
            Thanks for your payment of {formattedAmount} to {businessName} for invoice {invoiceNumber}.

            This email is your receipt - no further action is needed.
            """;
        var htmlBody = $"""
            <p>Thanks for your payment of <strong>{WebUtility.HtmlEncode(formattedAmount)}</strong> to {WebUtility.HtmlEncode(businessName)} for invoice <strong>{WebUtility.HtmlEncode(invoiceNumber)}</strong>.</p>
            <p>This email is your receipt - no further action is needed.</p>
            """;

        return new EmailMessage([payerEmail], [], $"Payment receipt - Invoice {invoiceNumber}", plainTextBody, htmlBody, [], replyTo);
    }
}
