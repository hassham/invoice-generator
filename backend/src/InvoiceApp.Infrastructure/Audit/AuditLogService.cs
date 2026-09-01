using System.Text.Json;
using System.Text.Json.Serialization;
using InvoiceApp.Application.Audit;
using InvoiceApp.Domain.Audit;
using InvoiceApp.Infrastructure.Persistence;

namespace InvoiceApp.Infrastructure.Audit;

public sealed class AuditLogService(ApplicationDbContext dbContext) : IAuditLogService
{
    // Program.cs's global JsonStringEnumConverter registration is on the ASP.NET Core JSON
    // options, which a bare JsonSerializer.Serialize call outside the HTTP pipeline never picks
    // up - without this, an enum in metadata (e.g. Invoice.Status) would serialize as its raw int
    // value instead of a readable name.
    private static readonly JsonSerializerOptions MetadataOptions = new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };

    public Task RecordAsync(Guid? userId, Guid? businessId, string entityType, Guid? entityId, string action, object? metadata, CancellationToken cancellationToken)
    {
        // Deliberately does not call SaveChangesAsync itself - stages the entry so it rides along
        // in the caller's own SaveChangesAsync call, keeping the audit entry and the action it
        // describes atomic (both committed together or neither is).
        dbContext.AuditLogs.Add(new AuditLog
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            BusinessId = businessId,
            EntityType = entityType,
            EntityId = entityId,
            Action = action,
            Metadata = metadata is null ? null : JsonSerializer.Serialize(metadata, MetadataOptions),
            Timestamp = DateTimeOffset.UtcNow,
        });
        return Task.CompletedTask;
    }
}
