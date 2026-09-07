namespace InvoiceApp.Application.Businesses;

public sealed record BusinessLogoFile(string PhysicalPath, string ContentType);

/// <summary>
/// Framework-agnostic (docs/SAD.md section 121 technology isolation) - Stream/string only, no
/// ASP.NET Core types, so this can live in Application. The real implementation (Infrastructure)
/// stores files on local disk; nothing else in this app has needed file storage until IG-52.
/// </summary>
public interface IBusinessLogoStorage
{
    Task SaveAsync(Guid businessId, Stream content, string contentType, CancellationToken cancellationToken);

    /// <summary>Removes any existing logo file for this business, regardless of its original
    /// extension/content type - a no-op if none exists.</summary>
    void Delete(Guid businessId);

    /// <summary>Null if this business has no stored logo.</summary>
    BusinessLogoFile? Locate(Guid businessId);
}
