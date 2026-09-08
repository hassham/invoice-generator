using InvoiceApp.Domain.Payments;

namespace InvoiceApp.Application.Payments;

/// <summary>FSD section 105.</summary>
public sealed record PaymentDto(
    Guid Id,
    Guid InvoiceId,
    DateOnly PaymentDate,
    decimal Amount,
    PaymentMethod PaymentMethod,
    string? Reference,
    string? Notes,
    DateTimeOffset CreatedAt);
