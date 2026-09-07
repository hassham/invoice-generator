namespace InvoiceApp.Application.Catalog;

public sealed record CatalogItemDto(
    Guid Id,
    string Name,
    string? Description,
    string? SKU,
    string? Unit,
    decimal UnitPrice,
    decimal? TaxRate,
    bool IsArchived,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);
