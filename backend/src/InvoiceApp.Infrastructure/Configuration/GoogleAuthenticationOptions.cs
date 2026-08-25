namespace InvoiceApp.Infrastructure.Configuration;

/// <summary>
/// Unlike <see cref="DatabaseOptions"/>, this is not validated on startup - Google sign-in is
/// optional (the app is fully usable via credential login without it), and every non-production
/// environment (local dev without a Google Cloud project set up yet, CI, tests) must still start
/// and run normally with these left blank. Hitting the Google endpoints without real values
/// configured fails clearly at that point instead (docs/SAD.md section 38, 67).
/// </summary>
public sealed class GoogleAuthenticationOptions
{
    public const string SectionName = "Authentication:Google";

    public string ClientId { get; init; } = string.Empty;

    public string ClientSecret { get; init; } = string.Empty;
}
