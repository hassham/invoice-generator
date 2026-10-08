using InvoiceApp.Domain.Invoicing;

namespace InvoiceApp.Infrastructure.Tests.Invoicing;

/// <summary>
/// IG-284 / IG-232 AC 3: "Reminders stop automatically once the invoice is paid or cancelled",
/// verified across all configured rules.
///
/// The job reads the clock directly, so rather than faking time these tests move the *invoice*:
/// one invoice is positioned on each of the five default rules' trigger days, so a single run
/// exercises every rule at once. An unpaid set therefore produces exactly five reminders, and that
/// number is what paying or cancelling has to drive to zero.
/// </summary>
public class ReminderStopOnPaymentTests
{
    /// <summary>Due offsets that make each of the five FSD default rules fire on the same day.</summary>
    private static readonly int[] TriggerDayOffsets = [3, 0, -3, -7, -14];

    private static async Task<(ReminderTestHarness Harness, List<Guid> InvoiceIds)> SeedAllRulesAsync(
        InvoiceStatus status = InvoiceStatus.Sent)
    {
        var harness = new ReminderTestHarness();
        var (businessId, customerId) = await harness.SeedBusinessAsync();
        await harness.SeedDefaultRulesAsync(businessId);

        var invoiceIds = new List<Guid>();
        foreach (var offset in TriggerDayOffsets)
        {
            invoiceIds.Add(await harness.SeedInvoiceAsync(
                businessId, customerId, dueInDays: offset, status: status, invoiceNumber: $"INV{offset}"));
        }

        return (harness, invoiceIds);
    }

    /// <summary>
    /// The control. Without this the "zero reminders" assertions below would pass even if the rules
    /// never fired for any reason.
    /// </summary>
    [Fact]
    public async Task Every_default_rule_fires_for_an_unpaid_invoice()
    {
        var (harness, _) = await SeedAllRulesAsync();
        using var _h = harness;

        await harness.RunOnceAsync();

        Assert.Equal(5, harness.EmailSender.Sent.Count);
        Assert.Equal(
            new[]
            {
                "Invoice 14 Days Overdue",
                "Invoice 3 Days Overdue",
                "Invoice 7 Days Overdue",
                "Invoice Due Today",
                "Invoice Due in 3 Days",
            },
            harness.EmailSender.Sent.Select(m => m.Subject).OrderBy(s => s, StringComparer.Ordinal).ToArray());
    }

    [Fact]
    public async Task No_rule_fires_for_a_paid_invoice()
    {
        var (harness, _) = await SeedAllRulesAsync(InvoiceStatus.Paid);
        using var _h = harness;

        await harness.RunOnceAsync();

        Assert.Empty(harness.EmailSender.Sent);
        Assert.Equal(0, await harness.SentReminderCountAsync());
    }

    [Fact]
    public async Task No_rule_fires_for_a_cancelled_invoice()
    {
        var (harness, _) = await SeedAllRulesAsync(InvoiceStatus.Cancelled);
        using var _h = harness;

        await harness.RunOnceAsync();

        Assert.Empty(harness.EmailSender.Sent);
        Assert.Equal(0, await harness.SentReminderCountAsync());
    }

    /// <summary>
    /// The real-world shape of this: the invoice was being chased, then the customer paid. Later
    /// rules must go quiet, and the earlier reminder must stay recorded rather than being undone.
    /// </summary>
    [Fact]
    public async Task Paying_an_invoice_stops_its_remaining_reminders()
    {
        using var harness = new ReminderTestHarness();
        var (businessId, customerId) = await harness.SeedBusinessAsync();
        await harness.SeedDefaultRulesAsync(businessId);

        // Due today: only the "due today" rule matches on this run.
        var invoiceId = await harness.SeedInvoiceAsync(businessId, customerId, dueInDays: 0);
        await harness.RunOnceAsync();
        Assert.Single(harness.EmailSender.Sent);

        await harness.SetInvoiceStatusAsync(invoiceId, InvoiceStatus.Paid);

        // Now move the same invoice onto the 3-days-overdue rule's trigger day and run again.
        await harness.ShiftDueDateAsync(invoiceId, -3);
        await harness.RunOnceAsync();

        Assert.Single(harness.EmailSender.Sent);
        Assert.Equal(1, await harness.SentReminderCountAsync());
    }

    [Fact]
    public async Task Cancelling_an_invoice_stops_its_remaining_reminders()
    {
        using var harness = new ReminderTestHarness();
        var (businessId, customerId) = await harness.SeedBusinessAsync();
        await harness.SeedDefaultRulesAsync(businessId);

        var invoiceId = await harness.SeedInvoiceAsync(businessId, customerId, dueInDays: 0);
        await harness.RunOnceAsync();
        Assert.Single(harness.EmailSender.Sent);

        await harness.SetInvoiceStatusAsync(invoiceId, InvoiceStatus.Cancelled);
        await harness.ShiftDueDateAsync(invoiceId, -7);
        await harness.RunOnceAsync();

        Assert.Single(harness.EmailSender.Sent);
    }

    /// <summary>
    /// A part payment is not payment. Chasing has to continue, or a customer who pays 1% of an
    /// invoice is never chased for the rest.
    /// </summary>
    [Fact]
    public async Task A_partially_paid_invoice_is_still_chased()
    {
        using var harness = new ReminderTestHarness();
        var (businessId, customerId) = await harness.SeedBusinessAsync();
        await harness.SeedDefaultRulesAsync(businessId);
        await harness.SeedInvoiceAsync(businessId, customerId, dueInDays: -7, status: InvoiceStatus.PartiallyPaid);

        await harness.RunOnceAsync();

        var message = Assert.Single(harness.EmailSender.Sent);
        Assert.Equal("Invoice 7 Days Overdue", message.Subject);
    }

    [Theory]
    [InlineData(InvoiceStatus.Draft, true)]
    [InlineData(InvoiceStatus.Sent, true)]
    [InlineData(InvoiceStatus.Viewed, true)]
    [InlineData(InvoiceStatus.PartiallyPaid, true)]
    [InlineData(InvoiceStatus.Overdue, true)]
    [InlineData(InvoiceStatus.Paid, false)]
    [InlineData(InvoiceStatus.Cancelled, false)]
    public async Task Only_paid_and_cancelled_silence_a_reminder(InvoiceStatus status, bool expectSend)
    {
        using var harness = new ReminderTestHarness();
        var (businessId, customerId) = await harness.SeedBusinessAsync();
        await harness.SeedInvoiceAsync(businessId, customerId, dueInDays: 0, status: status);
        await harness.SeedRuleAsync(businessId, ReminderTriggerType.OnDue, 0);

        await harness.RunOnceAsync();

        Assert.Equal(expectSend ? 1 : 0, harness.EmailSender.Sent.Count);
    }

    /// <summary>A soft-deleted invoice is not a document anyone should still be chased about.</summary>
    [Fact]
    public async Task A_deleted_invoice_is_never_chased()
    {
        using var harness = new ReminderTestHarness();
        var (businessId, customerId) = await harness.SeedBusinessAsync();
        var invoiceId = await harness.SeedInvoiceAsync(businessId, customerId, dueInDays: 0);
        await harness.SeedRuleAsync(businessId, ReminderTriggerType.OnDue, 0);
        await harness.SoftDeleteInvoiceAsync(invoiceId);

        await harness.RunOnceAsync();

        Assert.Empty(harness.EmailSender.Sent);
    }
}
