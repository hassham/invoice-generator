using System.Security.Cryptography;

namespace InvoiceApp.Infrastructure.Invoicing;

/// <summary>
/// IG-215: generates the hosted invoice page's unguessable token (docs/PRD.md section 19's
/// "app.example.com/i/a8F4kP2" example). No token-generation utility existed anywhere in this
/// codebase to reuse (ASP.NET Core Identity's password-reset tokens are a framework-internal,
/// IdentityUser-specific mechanism, not a general-purpose one) - this is new, CSPRNG-backed code.
/// </summary>
public static class PublicInvoiceTokenGenerator
{
    // Excludes visually ambiguous characters (0/O, 1/I/l) so a token that's read aloud or
    // hand-typed is unambiguous, matching the PRD's own example alphabet.
    private const string Alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz";

    // 16 chars * log2(57) =~ 93 bits of entropy - far beyond brute-force range even before the
    // lookup endpoint's own rate limiting (IG-215 AC: "sufficiently random").
    private const int Length = 16;

    /// <summary>RandomNumberGenerator.GetInt32 is unbiased (rejection sampling internally) -
    /// deliberately not `RandomNumberGenerator.GetBytes(n)[i] % Alphabet.Length`, which would
    /// introduce a slight modulo bias since 256 isn't a multiple of the alphabet's 57
    /// characters.</summary>
    public static string Generate()
    {
        var chars = new char[Length];
        for (var i = 0; i < Length; i++)
        {
            chars[i] = Alphabet[RandomNumberGenerator.GetInt32(Alphabet.Length)];
        }

        return new string(chars);
    }
}
