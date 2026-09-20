using InvoiceApp.Domain.Estimates;

namespace InvoiceApp.Application.Estimates;

/// <summary>
/// IG-221: the hosted estimate page's view model - mirrors HostedInvoiceDto, minus any payment
/// concept (no HasStripeAccount/AmountDue - estimates are never paid). Accept/Decline actions are
/// IG-222's own scope, not added here.
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
