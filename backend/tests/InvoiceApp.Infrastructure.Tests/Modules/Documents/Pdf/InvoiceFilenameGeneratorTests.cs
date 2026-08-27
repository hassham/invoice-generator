using InvoiceApp.Modules.Documents.Pdf;

namespace InvoiceApp.Infrastructure.Tests.Modules.Documents.Pdf;

public class InvoiceFilenameGeneratorTests
{
    [Fact]
    public void Produces_the_FSD_default_filename_format()
    {
        Assert.Equal("Invoice-INV-000123.pdf", InvoiceFilenameGenerator.Generate("INV-000123"));
    }

    [Theory]
    [InlineData("INV/000123", "Invoice-INV000123.pdf")]
    [InlineData("INV 000123", "Invoice-INV000123.pdf")]
    [InlineData("../../etc/passwd", "Invoice-etcpasswd.pdf")]
    [InlineData("INV#123!", "Invoice-INV123.pdf")]
    public void Strips_characters_unsafe_in_a_filename(string invoiceNumber, string expected)
    {
        Assert.Equal(expected, InvoiceFilenameGenerator.Generate(invoiceNumber));
    }
}
