namespace InvoiceApp.Application.Audit;

/// <summary>
/// FSD sections 83/107: an append-only trail of "material" actions. IG-50 wires this into the
/// invoice create/update path only - Duplicate/Cancel/Delete get their own audit entries from the
/// Stories (IG-48/49) that build those actions in the first place, not retrofitted here.
/// </summary>
public interface IAuditLogService
{
    Task RecordAsync(Guid? userId, Guid? businessId, string entityType, Guid? entityId, string action, object? metadata, CancellationToken cancellationToken);
}
