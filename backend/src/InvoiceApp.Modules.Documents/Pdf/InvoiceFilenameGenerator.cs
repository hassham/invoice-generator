using System.Text.RegularExpressions;

namespace InvoiceApp.Modules.Documents.Pdf;

/// <summary>FSD section 39: default filename format, with unsafe characters removed.</summary>
public static class InvoiceFilenameGenerator
{
    private static readonly Regex UnsafeCharacterPattern = new(@"[^a-zA-Z0-9\-_]", RegexOptions.Compiled);

    public static string Generate(string invoiceNumber)
    {
        var sanitized = UnsafeCharacterPattern.Replace(invoiceNumber, "");
        return $"Invoice-{sanitized}.pdf";
    }
}
