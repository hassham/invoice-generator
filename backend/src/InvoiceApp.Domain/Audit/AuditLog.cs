namespace InvoiceApp.Domain.Audit;

public sealed class AuditLog
{
    public Guid Id { get; set; }

    public Guid? UserId { get; set; }

    public Guid? BusinessId { get; set; }

    public string EntityType { get; set; } = string.Empty;

    public Guid? EntityId { get; set; }

    public string Action { get; set; } = string.Empty;

    public string? Metadata { get; set; }

    public string? IpAddress { get; set; }

    public DateTimeOffset Timestamp { get; set; }
}
