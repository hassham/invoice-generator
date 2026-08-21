namespace InvoiceApp.ArchitectureTests;

/// <summary>
/// Verifies the technology-isolation rule in docs/SAD.md section 121/AGENTS.md: Domain and
/// Application must not depend on ASP.NET Core, Entity Framework Core, PostgreSQL/Npgsql or
/// direct HTTP concerns. Those belong to Infrastructure. Checked against declared
/// &lt;PackageReference&gt; elements so a prohibited dependency is caught as soon as it is
/// added, before any code uses a type from it.
/// </summary>
public class TechnologyIsolationTests
{
    private static readonly string[] ProhibitedPackageNamePrefixes =
    [
        "Microsoft.AspNetCore",
        "Microsoft.EntityFrameworkCore",
        "Npgsql",
        "System.Net.Http",
    ];

    public static IEnumerable<object[]> DomainAndApplicationProjectNames =>
        new[] { "InvoiceApp.Domain", "InvoiceApp.Application" }.Select(name => new object[] { name });

    [Theory]
    [MemberData(nameof(DomainAndApplicationProjectNames))]
    public void Project_has_no_dependency_on_prohibited_technology(string projectName)
    {
        var packageReferences = ProjectFile.Load(projectName).PackageReferenceNames;

        var prohibitedReferences = packageReferences
            .Where(name => ProhibitedPackageNamePrefixes.Any(prefix => name.StartsWith(prefix, StringComparison.Ordinal)))
            .ToArray();

        Assert.True(
            prohibitedReferences.Length == 0,
            $"{projectName} has prohibited technology package references: {string.Join(", ", prohibitedReferences)}.");
    }
}
