using System.Security.Cryptography;

namespace InvoiceApp.Api.Services;

/// <summary>
/// IG-246: best-effort "opened" tracking. Each invoice email carries a 1x1 image whose address includes a
/// random token; loading the image records the open against that email's log row. Many mail clients block
/// remote images, so an email with no recorded open may still have been read.
/// </summary>
public static class EmailOpenTracking
{
    public static string NewToken() =>
        Convert.ToBase64String(RandomNumberGenerator.GetBytes(24)).Replace('+', '-').Replace('/', '_').TrimEnd('=');

    public static string PixelUrl(string apiBaseUrl, string token) =>
        $"{apiBaseUrl.TrimEnd('/')}/api/v1/public/email-opens/{token}";

    public static string PixelHtml(string pixelUrl) =>
        $"<img src=\"{pixelUrl}\" width=\"1\" height=\"1\" alt=\"\" style=\"display:block;border:0\" />";
}
