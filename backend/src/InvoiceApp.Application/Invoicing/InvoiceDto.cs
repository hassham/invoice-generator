using InvoiceApp.Domain.Invoicing;

namespace InvoiceApp.Application.Invoicing;

public sealed record InvoiceDto(
    Guid Id,
    Guid CustomerId,
    string InvoiceNumber,
    InvoiceStatus Status,
    DateOnly IssueDate,
    DateOnly DueDate,
    string Currency,
    string? Reference,
    decimal Subtotal,
    decimal DiscountAmount,
    decimal TaxAmount,
    decimal TotalAmount,
    decimal AmountPaid,
    decimal AmountDue,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);
