namespace InvoiceApp.Application.Customers;

/// <summary>
/// Shared by create and update (FSD section 56) - a PUT replaces the same supported fields a
/// POST creates, so one shape covers both rather than duplicating an identical record.
/// </summary>
public sealed record CustomerRequest(
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
    string? Notes);
