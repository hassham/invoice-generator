using InvoiceApp.Domain.Invoicing;

namespace InvoiceApp.Application.Invoicing;

/// <summary>
/// FSD sections 54/108: Overdue is a computed condition, never a value written to the stored
/// Status column - true whenever the invoice isn't Paid/Cancelled, its due date has passed, and a
/// balance remains. Used wherever a caller-facing status is read. The EF Core LINQ projections in
/// InvoiceService.ListAsync/DashboardService can't call this method directly (arbitrary method
/// calls don't translate to SQL), so they inline the same three conditions - keep both in sync if
/// this rule ever changes.
/// </summary>
public static class InvoiceStatusRules
{
    public static bool IsEffectivelyOverdue(InvoiceStatus status, DateOnly dueDate, decimal amountDue, DateOnly today) =>
        status != InvoiceStatus.Paid && status != InvoiceStatus.Cancelled && dueDate < today && amountDue > 0;

    public static InvoiceStatus DetermineEffectiveStatus(InvoiceStatus status, DateOnly dueDate, decimal amountDue, DateOnly today) =>
        IsEffectivelyOverdue(status, dueDate, amountDue, today) ? InvoiceStatus.Overdue : status;
}
