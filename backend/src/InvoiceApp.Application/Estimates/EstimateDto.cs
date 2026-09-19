using InvoiceApp.Domain.Estimates;

namespace InvoiceApp.Application.Estimates;

/// <summary>Mirrors InvoiceDto - no AmountPaid/AmountDue, an estimate has no payment concept.</summary>
public sealed record EstimateDto(
    Guid Id,
    Guid CustomerId,
    string EstimateNumber,
    EstimateStatus Status,
    DateOnly IssueDate,
    DateOnly ExpiryDate,
    string Currency,
    string? Reference,
    decimal Subtotal,
    decimal DiscountAmount,
    decimal TaxAmount,
    decimal TotalAmount,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);
