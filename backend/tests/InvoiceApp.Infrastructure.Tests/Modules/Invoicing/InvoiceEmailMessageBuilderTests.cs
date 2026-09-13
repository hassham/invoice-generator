using InvoiceApp.Application.Invoicing;
using InvoiceApp.Modules.Invoicing;

namespace InvoiceApp.Infrastructure.Tests.Modules.Invoicing;

public class InvoiceEmailMessageBuilderTests
{
    private static InvoiceEmailRequest Request(string message = "Please find your invoice attached.") => new(
        To: ["customer@example.com"],
        Cc: ["accounts@example.com"],
        Subject: "Invoice INV-0001 from Acme Pty Ltd",
        Message: message);

    [Fact]
    public void Carries_recipients_subject_and_reply_to_through_unchanged()
    {
        var message = InvoiceEmailMessageBuilder.Build(Request(), "http://localhost:3000/i/abc123", [1, 2, 3], "Invoice-0001.pdf", "seller@acme.example");

        Assert.Equal(["customer@example.com"], message.To);
        Assert.Equal(["accounts@example.com"], message.Cc);
        Assert.Equal("Invoice INV-0001 from Acme Pty Ltd", message.Subject);
        Assert.Equal("seller@acme.example", message.ReplyTo);
    }

    [Fact]
    public void Attaches_the_pdf_bytes_under_the_given_filename()
    {
        byte[] pdfBytes = [1, 2, 3, 4];

        var message = InvoiceEmailMessageBuilder.Build(Request(), "http://localhost:3000/i/abc123", pdfBytes, "Invoice-0001.pdf", null);

        var attachment = Assert.Single(message.Attachments);
        Assert.Equal("Invoice-0001.pdf", attachment.FileName);
        Assert.Equal("application/pdf", attachment.ContentType);
        Assert.Equal(pdfBytes, attachment.Content);
    }

    [Fact]
    public void Includes_the_senders_own_message_and_the_hosted_link_in_both_bodies()
    {
        var message = InvoiceEmailMessageBuilder.Build(Request("Thanks for your business!"), "http://localhost:3000/i/abc123", [], "Invoice-0001.pdf", null);

        Assert.Contains("Thanks for your business!", message.PlainTextBody);
        Assert.Contains("http://localhost:3000/i/abc123", message.PlainTextBody);
        Assert.Contains("Thanks for your business!", message.HtmlBody);
        Assert.Contains("http://localhost:3000/i/abc123", message.HtmlBody);
    }

    [Fact]
    public void Html_encodes_the_senders_message_before_it_reaches_the_html_body()
    {
        var message = InvoiceEmailMessageBuilder.Build(Request("<script>alert('hi')</script>"), "http://localhost:3000/i/abc123", [], "Invoice-0001.pdf", null);

        Assert.DoesNotContain("<script>", message.HtmlBody);
        Assert.Contains("&lt;script&gt;", message.HtmlBody);
        // The plain-text body is never rendered as HTML, so the sender's own text is carried
        // through verbatim there - only the HTML body needs encoding.
        Assert.Contains("<script>alert('hi')</script>", message.PlainTextBody);
    }

    [Fact]
    public void Renders_line_breaks_in_the_message_as_br_tags_in_the_html_body()
    {
        var message = InvoiceEmailMessageBuilder.Build(Request("Line one\nLine two"), "http://localhost:3000/i/abc123", [], "Invoice-0001.pdf", null);

        Assert.Contains("Line one<br />Line two", message.HtmlBody);
    }

    [Fact]
    public void Leaves_reply_to_null_when_the_business_has_no_email_on_file()
    {
        var message = InvoiceEmailMessageBuilder.Build(Request(), "http://localhost:3000/i/abc123", [], "Invoice-0001.pdf", null);

        Assert.Null(message.ReplyTo);
    }
}
