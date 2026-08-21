namespace InvoiceApp.Domain.Catalog;

public sealed class CatalogItem
{
    public Guid Id { get; set; }

    public Guid BusinessId { get; set; }

    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public string? SKU { get; set; }

    public string? Unit { get; set; }

    public decimal UnitPrice { get; set; }

    public decimal? TaxRate { get; set; }

    public bool IsArchived { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }
}
