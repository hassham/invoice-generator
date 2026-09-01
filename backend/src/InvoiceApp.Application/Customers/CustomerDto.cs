namespace InvoiceApp.Application.Customers;

public sealed record CustomerDto(
    Guid Id,
    string? BusinessName,
    string? ContactName,
    string? Email,
    string? Phone,
    string? AddressLine1,
    string? AddressLine2,
    string? City,
    string? State,
    string? PostalCode,
    string? Country,
    string? TaxNumber,
    string? Notes,
    bool IsArchived,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);
