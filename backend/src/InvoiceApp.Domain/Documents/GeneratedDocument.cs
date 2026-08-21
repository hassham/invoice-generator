namespace InvoiceApp.Domain.Documents;

public sealed class GeneratedDocument
{
    public Guid Id { get; set; }

    public Guid InvoiceId { get; set; }

    public string FileName { get; set; } = string.Empty;

    public string ContentType { get; set; } = "application/pdf";

    public string StorageKey { get; set; } = string.Empty;

    public long? SizeInBytes { get; set; }

    public DateTimeOffset GeneratedAt { get; set; }

    public Guid? GeneratedByUserId { get; set; }
}
