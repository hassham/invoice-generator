namespace InvoiceApp.ArchitectureTests;

/// <summary>
/// Verifies the project-reference direction described in docs/SAD.md sections 26-27:
/// Domain has no internal dependencies; Application depends only on Domain; Infrastructure
/// and business modules depend only on Application/Domain; the Api composition root may
/// depend on Infrastructure and the business modules. Checked against the declared
/// &lt;ProjectReference&gt; elements so a prohibited reference is caught as soon as it is
/// added, before any code uses a type from it.
/// </summary>
public class ModuleReferenceBoundaryTests
{
    private static readonly IReadOnlyDictionary<string, string[]> AllowedInternalReferences = new Dictionary<string, string[]>
    {
        ["InvoiceApp.Domain"] = [],
        ["InvoiceApp.Application"] = ["InvoiceApp.Domain"],
        ["InvoiceApp.Infrastructure"] = ["InvoiceApp.Domain", "InvoiceApp.Application"],
        ["InvoiceApp.Modules.Audit"] = ["InvoiceApp.Domain", "InvoiceApp.Application"],
        ["InvoiceApp.Modules.Businesses"] = ["InvoiceApp.Domain", "InvoiceApp.Application"],
        ["InvoiceApp.Modules.Catalog"] = ["InvoiceApp.Domain", "InvoiceApp.Application"],
        ["InvoiceApp.Modules.Customers"] = ["InvoiceApp.Domain", "InvoiceApp.Application"],
        ["InvoiceApp.Modules.Documents"] = ["InvoiceApp.Domain", "InvoiceApp.Application"],
        ["InvoiceApp.Modules.Identity"] = ["InvoiceApp.Domain", "InvoiceApp.Application"],
        ["InvoiceApp.Modules.Invoicing"] = ["InvoiceApp.Domain", "InvoiceApp.Application"],
        ["InvoiceApp.Modules.Payments"] = ["InvoiceApp.Domain", "InvoiceApp.Application"],
        ["InvoiceApp.Api"] =
        [
            "InvoiceApp.Domain",
            "InvoiceApp.Application",
            "InvoiceApp.Infrastructure",
            "InvoiceApp.Modules.Audit",
            "InvoiceApp.Modules.Businesses",
            "InvoiceApp.Modules.Catalog",
            "InvoiceApp.Modules.Customers",
            "InvoiceApp.Modules.Documents",
            "InvoiceApp.Modules.Identity",
            "InvoiceApp.Modules.Invoicing",
            "InvoiceApp.Modules.Payments",
        ],
    };

    public static IEnumerable<object[]> ProjectsUnderTest =>
        AllowedInternalReferences.Keys.Select(projectName => new object[] { projectName });

    [Theory]
    [MemberData(nameof(ProjectsUnderTest))]
    public void Project_references_only_its_allowed_internal_dependencies(string projectName)
    {
        var allowedReferences = AllowedInternalReferences[projectName];
        var actualReferences = ProjectFile.Load(projectName).ProjectReferenceNames;

        var prohibitedReferences = actualReferences.Except(allowedReferences).ToArray();

        Assert.True(
            prohibitedReferences.Length == 0,
            $"{projectName} has prohibited project references: {string.Join(", ", prohibitedReferences)}. " +
            $"Allowed: {string.Join(", ", allowedReferences)}.");
    }
}
