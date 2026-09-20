using System.Text.RegularExpressions;

namespace InvoiceApp.Modules.Documents.Pdf;

/// <summary>FSD section 39: default filename format, with unsafe characters removed.</summary>
public static class InvoiceFilenameGenerator
{
    private static readonly Regex UnsafeCharacterPattern = new(@"[^a-zA-Z0-9\-_]", RegexOptions.Compiled);

    // IG-221: reused as-is for estimates via documentLabel="Estimate" - defaults to "Invoice" so
    // every existing call site's filename is unaffected.
    public static string Generate(string invoiceNumber, string documentLabel = "Invoice")
    {
        var sanitized = UnsafeCharacterPattern.Replace(invoiceNumber, "");
        return $"{documentLabel}-{sanitized}.pdf";
    }
}
