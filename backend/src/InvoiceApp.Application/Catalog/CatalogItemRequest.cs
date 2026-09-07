namespace InvoiceApp.Application.Catalog;

/// <summary>Shared by create and update (FSD section 60), same precedent as
/// BusinessProfileRequest/CustomerRequest - a PUT replaces the same supported fields a POST
/// creates, so one shape covers both.</summary>
public sealed record CatalogItemRequest(
    string Name,
    string? Description,
    string? SKU,
    string? Unit,
    decimal UnitPrice,
    decimal? TaxRate);
