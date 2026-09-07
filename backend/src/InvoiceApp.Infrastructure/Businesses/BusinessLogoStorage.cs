using InvoiceApp.Application.Businesses;
using Microsoft.AspNetCore.Hosting;

namespace InvoiceApp.Infrastructure.Businesses;

/// <summary>
/// IG-52: local-disk storage under the API project's content root. This app has no cloud
/// blob/object storage configured anywhere, and a single-server deployment has no need for one
/// yet - revisit if that changes. Keyed by business id with the extension implied by content
/// type, so re-uploading a logo in a different format doesn't leave the old file behind (Delete
/// is called before every Save).
/// </summary>
public sealed class BusinessLogoStorage(IWebHostEnvironment environment) : IBusinessLogoStorage
{
    private static readonly IReadOnlyDictionary<string, string> ExtensionsByContentType = new Dictionary<string, string>
    {
        ["image/jpeg"] = ".jpg",
        ["image/png"] = ".png",
        ["image/webp"] = ".webp",
    };

    private string RootPath => Path.Combine(environment.ContentRootPath, "App_Data", "business-logos");

    public async Task SaveAsync(Guid businessId, Stream content, string contentType, CancellationToken cancellationToken)
    {
        Delete(businessId);
        Directory.CreateDirectory(RootPath);
        var path = Path.Combine(RootPath, businessId + ExtensionsByContentType[contentType]);
        await using var fileStream = File.Create(path);
        await content.CopyToAsync(fileStream, cancellationToken);
    }

    public void Delete(Guid businessId)
    {
        if (!Directory.Exists(RootPath))
        {
            return;
        }

        foreach (var extension in ExtensionsByContentType.Values)
        {
            var path = Path.Combine(RootPath, businessId + extension);
            if (File.Exists(path))
            {
                File.Delete(path);
            }
        }
    }

    public BusinessLogoFile? Locate(Guid businessId)
    {
        foreach (var (contentType, extension) in ExtensionsByContentType)
        {
            var path = Path.Combine(RootPath, businessId + extension);
            if (File.Exists(path))
            {
                return new BusinessLogoFile(path, contentType);
            }
        }

        return null;
    }
}
