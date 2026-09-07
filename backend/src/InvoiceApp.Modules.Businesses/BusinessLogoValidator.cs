using InvoiceApp.Application.Exceptions;

namespace InvoiceApp.Modules.Businesses;

/// <summary>
/// FSD section 14: "Must be valid image," "Reject executable or renamed files." Mirrors
/// frontend/app/invoice/create/lib/logoUpload.ts's rules exactly (same accepted types, same 5MB
/// cap, same magic-byte signature check) - defense in depth, since the client-side check alone
/// can't be trusted against a direct API call.
/// </summary>
public static class BusinessLogoValidator
{
    public static readonly string[] AcceptedContentTypes = ["image/jpeg", "image/png", "image/webp"];
    public const long MaxFileSizeBytes = 5 * 1024 * 1024;

    private static readonly byte[] JpegSignature = [0xFF, 0xD8, 0xFF];
    private static readonly byte[] PngSignature = [0x89, 0x50, 0x4E, 0x47];
    private static readonly byte[] RiffSignature = [0x52, 0x49, 0x46, 0x46];
    private static readonly byte[] WebpSignatureAtOffset8 = [0x57, 0x45, 0x42, 0x50];

    public static async Task ValidateAsync(Stream content, string? contentType, long contentLength, CancellationToken cancellationToken)
    {
        if (contentType is null || !AcceptedContentTypes.Contains(contentType))
        {
            throw new ValidationException("Logo must be a JPG, PNG, or WEBP image.");
        }

        if (contentLength > MaxFileSizeBytes)
        {
            throw new ValidationException("Logo must be 5 MB or smaller.");
        }

        if (!await HasValidImageSignatureAsync(content, cancellationToken))
        {
            throw new ValidationException("This file doesn't look like a valid image.");
        }
    }

    private static async Task<bool> HasValidImageSignatureAsync(Stream content, CancellationToken cancellationToken)
    {
        var buffer = new byte[12];
        var totalRead = 0;
        while (totalRead < buffer.Length)
        {
            var read = await content.ReadAsync(buffer.AsMemory(totalRead, buffer.Length - totalRead), cancellationToken);
            if (read == 0)
            {
                break;
            }

            totalRead += read;
        }

        content.Position = 0;

        return MatchesSignature(buffer, JpegSignature)
            || MatchesSignature(buffer, PngSignature)
            // WEBP files are a RIFF container: "RIFF" at byte 0, size at bytes 4-7, "WEBP" at byte 8.
            || (MatchesSignature(buffer, RiffSignature) && MatchesSignature(buffer, WebpSignatureAtOffset8, 8));
    }

    private static bool MatchesSignature(byte[] buffer, byte[] signature, int offset = 0)
    {
        if (buffer.Length < offset + signature.Length)
        {
            return false;
        }

        for (var i = 0; i < signature.Length; i++)
        {
            if (buffer[offset + i] != signature[i])
            {
                return false;
            }
        }

        return true;
    }
}
