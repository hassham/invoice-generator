using System.Runtime.CompilerServices;
using System.Xml.Linq;

namespace InvoiceApp.ArchitectureTests;

/// <summary>
/// Reads the declared &lt;ProjectReference&gt;/&lt;PackageReference&gt; elements of a .csproj file.
/// Boundary tests assert against these declarations directly, rather than against compiled-assembly
/// metadata, because the C# compiler omits an AssemblyRef for a reference that no code uses yet -
/// a project reference alone must be caught even before any type from it is consumed.
/// </summary>
internal sealed class ProjectFile
{
    private readonly XDocument _document;

    private ProjectFile(XDocument document)
    {
        _document = document;
    }

    public static ProjectFile Load(string projectName)
    {
        var path = Path.Combine(SrcDirectory, projectName, $"{projectName}.csproj");

        if (!File.Exists(path))
        {
            throw new FileNotFoundException($"Expected project file not found: {path}");
        }

        return new ProjectFile(XDocument.Load(path));
    }

    public string[] ProjectReferenceNames =>
        _document.Descendants("ProjectReference")
            .Select(element => element.Attribute("Include")?.Value)
            .Where(include => include is not null)
            .Select(include => Path.GetFileNameWithoutExtension(include!))
            .ToArray();

    public string[] PackageReferenceNames =>
        _document.Descendants("PackageReference")
            .Select(element => element.Attribute("Include")?.Value)
            .Where(include => include is not null)
            .Select(include => include!)
            .ToArray();

    private static string SrcDirectory => Path.Combine(BackendDirectory, "src");

    private static string BackendDirectory =>
        Path.GetFullPath(Path.Combine(Path.GetDirectoryName(ThisFilePath())!, "..", ".."));

    private static string ThisFilePath([CallerFilePath] string path = "") => path;
}
