using InvoiceApp.Domain.Estimates;

namespace InvoiceApp.Application.Estimates;

/// <summary>
/// IG-221: the hosted estimate page's view model - mirrors HostedInvoiceDto, minus any payment
/// concept (no HasStripeAccount/AmountDue - estimates are never paid). IG-222's Accept/Decline
/// endpoints return this same shape (with the updated Status) rather than a separate DTO, since the
/// frontend needs nothing more than an updated status badge after the action.
/// </summary>
public sealed record HostedEstimateDto(
    string BusinessName,
    string? LogoUrl,
    string EstimateNumber,
    EstimateStatus Status,
    DateOnly IssueDate,
    DateOnly ExpiryDate,
    string Currency,
    decimal TotalAmount);
