using System.Runtime.CompilerServices;
using System.Text.Json;

namespace InvoiceApp.Infrastructure.Tests.Configuration;

/// <summary>
/// Verifies IG-76's completion criteria that secrets stay outside source control: the base
/// appsettings.json ships to every environment, including Production, so it must never define a
/// secret-shaped section (docs/SAD.md section 67 examples: ConnectionStrings, Authentication,
/// Storage, Email, Payments). Local-only, non-production values belong in
/// appsettings.Development.json; real secrets belong in `dotnet user-secrets` (local) or
/// hosting-environment configuration (deployed), never in a file committed to source control.
/// </summary>
public class SecretsHygieneTests
{
    private static readonly string[] SecretShapedSectionNames =
    [
        "ConnectionStrings",
        "Authentication",
        "Storage",
        "Email",
        "Payments",
    ];

    [Fact]
    public void Base_appsettings_has_no_secret_shaped_sections()
    {
        var path = Path.Combine(ApiDirectory, "appsettings.json");
        using var document = JsonDocument.Parse(File.ReadAllText(path));

        var presentSecretSections = SecretShapedSectionNames
            .Where(name => document.RootElement.TryGetProperty(name, out _))
            .ToArray();

        Assert.True(
            presentSecretSections.Length == 0,
            $"appsettings.json (committed and loaded by every environment) must not define " +
            $"{string.Join(", ", presentSecretSections)}. Provide these via appsettings.Development.json " +
            "for local-only, non-production values, or via dotnet user-secrets / hosting-environment " +
            "configuration for anything real.");
    }

    private static string ApiDirectory =>
        Path.GetFullPath(Path.Combine(Path.GetDirectoryName(ThisFilePath())!, "..", "..", "..", "src", "InvoiceApp.Api"));

    private static string ThisFilePath([CallerFilePath] string path = "") => path;
}
