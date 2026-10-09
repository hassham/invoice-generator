using InvoiceApp.Domain.Invoicing;
using Microsoft.EntityFrameworkCore;

namespace InvoiceApp.Infrastructure.Tests.Invoicing;

/// <summary>
/// IG-282: "Already-generated invoices remain unchanged after pausing or cancelling their
/// schedule", plus IG-231's own two criteria — pausing stops future generation without deleting
/// the schedule or its history, and cancelling stops it permanently.
///
/// The point of this subtask is that stopping a billing arrangement must never reach backwards
/// into invoices the customer has already been sent.
/// </summary>
public class RecurringPauseCancelTests
{
    /// <summary>A comparable snapshot of everything about a generated invoice that must not move.</summary>
    private sealed record InvoiceSnapshot(
        Guid Id,
        string Number,
        InvoiceStatus Status,
        DateOnly IssueDate,
        DateOnly DueDate,
        decimal TotalAmount,
        decimal AmountDue,
        bool IsDeleted,
        int ItemCount);

    private static InvoiceSnapshot Snapshot(Invoice invoice) => new(
        invoice.Id,
        invoice.InvoiceNumber,
        invoice.Status,
        invoice.IssueDate,
        invoice.DueDate,
        invoice.TotalAmount,
        invoice.AmountDue,
        invoice.IsDeleted,
        invoice.Items.Count);

    private static async Task<(RecurringTestHarness Harness, Guid ScheduleId, InvoiceSnapshot Generated)>
        GeneratedOnceAsync()
    {
        var harness = new RecurringTestHarness();
        await harness.SeedAsync();
        var scheduleId = await harness.SeedDueScheduleAsync();

        await harness.RunOnceAsync();

        var generated = Assert.Single(await harness.GeneratedInvoicesAsync());
        return (harness, scheduleId, Snapshot(generated));
    }

    /// <summary>The control. Without it every "nothing further was generated" assertion is vacuous.</summary>
    [Fact]
    public async Task Generates_an_invoice_from_a_due_schedule()
    {
        var (harness, _, generated) = await GeneratedOnceAsync();
        using var _h = harness;

        Assert.Equal(InvoiceStatus.Draft, generated.Status);
        Assert.Equal(550m, generated.TotalAmount);
        Assert.False(generated.IsDeleted);
    }

    // IG-282's criterion, for pause.
    [Fact]
    public async Task Pausing_leaves_an_already_generated_invoice_untouched()
    {
        var (harness, scheduleId, before) = await GeneratedOnceAsync();
        using var _h = harness;

        await harness.PauseAsync(scheduleId);
        await harness.MakeDueAsync(scheduleId);
        await harness.RunOnceAsync();

        var after = Snapshot(Assert.Single(await harness.GeneratedInvoicesAsync()));
        Assert.Equal(before, after);
    }

    // IG-282's criterion, for cancel.
    [Fact]
    public async Task Cancelling_leaves_an_already_generated_invoice_untouched()
    {
        var (harness, scheduleId, before) = await GeneratedOnceAsync();
        using var _h = harness;

        await harness.CancelAsync(scheduleId);
        await harness.MakeDueAsync(scheduleId);
        await harness.RunOnceAsync();

        var after = Snapshot(Assert.Single(await harness.GeneratedInvoicesAsync()));
        Assert.Equal(before, after);
    }

    /// <summary>
    /// The invoice must survive as a real document, not merely as an unchanged row - a cancelled
    /// arrangement should never soft-delete what has already been billed.
    /// </summary>
    [Fact]
    public async Task A_cancelled_schedules_invoices_are_not_deleted_with_it()
    {
        var (harness, scheduleId, before) = await GeneratedOnceAsync();
        using var _h = harness;

        await harness.CancelAsync(scheduleId);

        await using var db = harness.NewDbContext();
        var invoice = await db.Invoices.SingleAsync(i => i.Id == before.Id);
        Assert.False(invoice.IsDeleted);
        Assert.Null(invoice.DeletedAt);
    }

    // IG-231 AC 1.
    [Fact]
    public async Task Pausing_stops_future_generation()
    {
        var (harness, scheduleId, _) = await GeneratedOnceAsync();
        using var _h = harness;

        await harness.PauseAsync(scheduleId);
        await harness.MakeDueAsync(scheduleId);
        await harness.RunOnceAsync();
        await harness.MakeDueAsync(scheduleId);
        await harness.RunOnceAsync();

        Assert.Single(await harness.GeneratedInvoicesAsync());
    }

    /// <summary>IG-231 AC 1 again: "without deleting the schedule or its history".</summary>
    [Fact]
    public async Task Pausing_keeps_the_schedule_and_its_history()
    {
        var (harness, scheduleId, _) = await GeneratedOnceAsync();
        using var _h = harness;

        await harness.PauseAsync(scheduleId);

        await using var db = harness.NewDbContext();
        var schedule = await db.RecurringSchedules.SingleAsync(rs => rs.Id == scheduleId);
        Assert.False(schedule.IsActive);
        Assert.False(schedule.IsDeleted);
        Assert.Null(schedule.DeletedAt);
        // Still pointing at the template it was built from.
        Assert.Equal(harness.TemplateInvoiceId, schedule.InvoiceTemplateId);
    }

    [Fact]
    public async Task Resuming_a_paused_schedule_generates_again()
    {
        var (harness, scheduleId, _) = await GeneratedOnceAsync();
        using var _h = harness;

        await harness.PauseAsync(scheduleId);
        await harness.MakeDueAsync(scheduleId);
        await harness.RunOnceAsync();
        Assert.Single(await harness.GeneratedInvoicesAsync());

        await harness.ResumeAsync(scheduleId);
        await harness.MakeDueAsync(scheduleId);
        await harness.RunOnceAsync();

        Assert.Equal(2, (await harness.GeneratedInvoicesAsync()).Count);
    }

    // IG-231 AC 2: permanently.
    [Fact]
    public async Task Cancelling_stops_generation_permanently()
    {
        var (harness, scheduleId, _) = await GeneratedOnceAsync();
        using var _h = harness;

        await harness.CancelAsync(scheduleId);

        for (var run = 0; run < 5; run++)
        {
            await harness.MakeDueAsync(scheduleId);
            await harness.RunOnceAsync();
        }

        Assert.Single(await harness.GeneratedInvoicesAsync());
    }

    /// <summary>
    /// Cancelling is a soft delete, so the record of what was billed and why survives - the
    /// schedule is still there to be read, just inactive and deleted.
    /// </summary>
    [Fact]
    public async Task A_cancelled_schedule_is_soft_deleted_not_removed()
    {
        var (harness, scheduleId, _) = await GeneratedOnceAsync();
        using var _h = harness;

        await harness.CancelAsync(scheduleId);

        await using var db = harness.NewDbContext();
        var schedule = await db.RecurringSchedules.SingleAsync(rs => rs.Id == scheduleId);
        Assert.True(schedule.IsDeleted);
        Assert.False(schedule.IsActive);
        Assert.NotNull(schedule.DeletedAt);
    }

    /// <summary>Pausing one schedule must not quietly stop another.</summary>
    [Fact]
    public async Task Pausing_one_schedule_does_not_stop_another()
    {
        using var harness = new RecurringTestHarness();
        await harness.SeedAsync();
        var pausedId = await harness.SeedDueScheduleAsync();
        var activeId = await harness.SeedDueScheduleAsync();

        await harness.RunOnceAsync();
        Assert.Equal(2, (await harness.GeneratedInvoicesAsync()).Count);

        await harness.PauseAsync(pausedId);
        await harness.MakeDueAsync(pausedId);
        await harness.MakeDueAsync(activeId);
        await harness.RunOnceAsync();

        // Only the still-active schedule generated a third invoice.
        Assert.Equal(3, (await harness.GeneratedInvoicesAsync()).Count);
    }
}
