using InvoiceApp.Domain.Invoicing;

namespace InvoiceApp.Infrastructure.Tests.Invoicing;

/// <summary>
/// IG-286 / IG-233 AC 3: "No duplicate reminder is sent for the same rule/invoice pair."
///
/// This is the guard standing between a daily background job and a customer being emailed the same
/// chase repeatedly. Until now nothing asserted it — <see cref="ReminderSendingService"/> had no
/// test coverage of any kind.
/// </summary>
public class ReminderDeduplicationTests
{
    [Fact]
    public async Task Sends_a_reminder_when_a_rule_matches()
    {
        using var harness = new ReminderTestHarness();
        var (businessId, customerId) = await harness.SeedBusinessAsync();
        await harness.SeedInvoiceAsync(businessId, customerId, dueInDays: -3);
        await harness.SeedRuleAsync(businessId, ReminderTriggerType.DaysOverdue, 3, subject: "3 days overdue");

        await harness.RunOnceAsync();

        var message = Assert.Single(harness.EmailSender.Sent);
        Assert.Equal("3 days overdue", message.Subject);
        Assert.Equal("customer@example.com", Assert.Single(message.To));
    }

    /// <summary>The regression this subtask exists for: running the job twice must not email twice.</summary>
    [Fact]
    public async Task Does_not_send_the_same_rule_twice_for_the_same_invoice()
    {
        using var harness = new ReminderTestHarness();
        var (businessId, customerId) = await harness.SeedBusinessAsync();
        await harness.SeedInvoiceAsync(businessId, customerId, dueInDays: -3);
        await harness.SeedRuleAsync(businessId, ReminderTriggerType.DaysOverdue, 3);

        await harness.RunOnceAsync();
        await harness.RunOnceAsync();
        await harness.RunOnceAsync();

        Assert.Single(harness.EmailSender.Sent);
        Assert.Equal(1, await harness.SentReminderCountAsync());
    }

    /// <summary>
    /// The guard has to be durable, not just in-memory for one pass - it is a row, read back at the
    /// start of every run. A restart between runs must not re-send.
    /// </summary>
    [Fact]
    public async Task Records_the_send_so_the_guard_survives_a_restart()
    {
        using var harness = new ReminderTestHarness();
        var (businessId, customerId) = await harness.SeedBusinessAsync();
        var invoiceId = await harness.SeedInvoiceAsync(businessId, customerId, dueInDays: 0);
        var ruleId = await harness.SeedRuleAsync(businessId, ReminderTriggerType.OnDue, 0);

        await harness.RunOnceAsync();

        await using var db = harness.NewDbContext();
        var sent = Assert.Single(db.RemindersSent);
        Assert.Equal(invoiceId, sent.InvoiceId);
        Assert.Equal(ruleId, sent.ReminderRuleId);
    }

    /// <summary>
    /// Deduplication is per rule/invoice pair, not per invoice - two different rules falling due on
    /// the same day must both send, or a business loses reminders it configured.
    /// </summary>
    [Fact]
    public async Task Two_rules_matching_the_same_invoice_each_send_once()
    {
        using var harness = new ReminderTestHarness();
        var (businessId, customerId) = await harness.SeedBusinessAsync();
        await harness.SeedInvoiceAsync(businessId, customerId, dueInDays: 0);
        await harness.SeedRuleAsync(businessId, ReminderTriggerType.OnDue, 0, subject: "Due today");
        await harness.SeedRuleAsync(businessId, ReminderTriggerType.OnDue, 0, subject: "Also due today");

        await harness.RunOnceAsync();
        await harness.RunOnceAsync();

        Assert.Equal(2, harness.EmailSender.Sent.Count);
        Assert.Equal(
            new[] { "Also due today", "Due today" },
            harness.EmailSender.Sent.Select(m => m.Subject).OrderBy(s => s).ToArray());
    }

    /// <summary>The mirror case: one rule must still fire for every invoice that matches it.</summary>
    [Fact]
    public async Task One_rule_sends_for_each_matching_invoice()
    {
        using var harness = new ReminderTestHarness();
        var (businessId, customerId) = await harness.SeedBusinessAsync();
        await harness.SeedInvoiceAsync(businessId, customerId, dueInDays: 0, invoiceNumber: "INV-1");
        await harness.SeedInvoiceAsync(businessId, customerId, dueInDays: 0, invoiceNumber: "INV-2");
        await harness.SeedRuleAsync(businessId, ReminderTriggerType.OnDue, 0);

        await harness.RunOnceAsync();
        await harness.RunOnceAsync();

        Assert.Equal(2, harness.EmailSender.Sent.Count);
    }

    /// <summary>
    /// A send that throws must not record a ReminderSent row - otherwise the dedup guard would
    /// suppress the retry and the customer would never be chased at all.
    /// </summary>
    [Fact]
    public async Task A_failed_send_is_not_recorded_as_sent()
    {
        using var harness = new ReminderTestHarness();
        var (businessId, customerId) = await harness.SeedBusinessAsync();
        await harness.SeedInvoiceAsync(businessId, customerId, dueInDays: -7);
        await harness.SeedRuleAsync(businessId, ReminderTriggerType.DaysOverdue, 7);
        harness.EmailSender.FailWith = _ => new InvalidOperationException("SMTP down");

        await harness.RunOnceAsync();

        Assert.Empty(harness.EmailSender.Sent);
        Assert.Equal(0, await harness.SentReminderCountAsync());
    }

    /// <summary>And once the transient failure clears, the reminder does go out.</summary>
    [Fact]
    public async Task A_reminder_that_failed_is_sent_on_a_later_run()
    {
        using var harness = new ReminderTestHarness();
        var (businessId, customerId) = await harness.SeedBusinessAsync();
        await harness.SeedInvoiceAsync(businessId, customerId, dueInDays: -7);
        await harness.SeedRuleAsync(businessId, ReminderTriggerType.DaysOverdue, 7);

        harness.EmailSender.FailWith = _ => new InvalidOperationException("SMTP down");
        await harness.RunOnceAsync();

        harness.EmailSender.FailWith = null;
        await harness.RunOnceAsync();

        Assert.Single(harness.EmailSender.Sent);
    }

    [Fact]
    public async Task A_rule_never_applies_to_another_businesss_invoice()
    {
        using var harness = new ReminderTestHarness();
        var (ownerBusinessId, ownerCustomerId) = await harness.SeedBusinessAsync("owner@example.com");
        var (otherBusinessId, _) = await harness.SeedBusinessAsync("other@example.com");

        await harness.SeedInvoiceAsync(ownerBusinessId, ownerCustomerId, dueInDays: 0);
        // The rule belongs to the other business entirely.
        await harness.SeedRuleAsync(otherBusinessId, ReminderTriggerType.OnDue, 0);

        await harness.RunOnceAsync();

        Assert.Empty(harness.EmailSender.Sent);
    }

    [Fact]
    public async Task An_inactive_rule_sends_nothing()
    {
        using var harness = new ReminderTestHarness();
        var (businessId, customerId) = await harness.SeedBusinessAsync();
        await harness.SeedInvoiceAsync(businessId, customerId, dueInDays: 0);
        await harness.SeedRuleAsync(businessId, ReminderTriggerType.OnDue, 0, isActive: false);

        await harness.RunOnceAsync();

        Assert.Empty(harness.EmailSender.Sent);
    }

    [Fact]
    public async Task A_customer_with_no_email_address_is_skipped_rather_than_crashing_the_run()
    {
        using var harness = new ReminderTestHarness();
        var (businessId, customerId) = await harness.SeedBusinessAsync(email: null!);
        await harness.SeedInvoiceAsync(businessId, customerId, dueInDays: 0);
        await harness.SeedRuleAsync(businessId, ReminderTriggerType.OnDue, 0);

        await harness.RunOnceAsync();

        Assert.Empty(harness.EmailSender.Sent);
    }

    [Theory]
    [InlineData(ReminderTriggerType.BeforeDue, 3, -3, false)] // due in 3 days -> dueInDays +3, not -3
    [InlineData(ReminderTriggerType.BeforeDue, 3, 3, true)]
    [InlineData(ReminderTriggerType.OnDue, 0, 0, true)]
    [InlineData(ReminderTriggerType.OnDue, 0, -1, false)]
    [InlineData(ReminderTriggerType.DaysOverdue, 7, -7, true)]
    [InlineData(ReminderTriggerType.DaysOverdue, 7, -6, false)]
    public async Task Only_fires_on_the_exact_day_the_rule_describes(
        ReminderTriggerType triggerType, int triggerValue, int dueInDays, bool expectSend)
    {
        using var harness = new ReminderTestHarness();
        var (businessId, customerId) = await harness.SeedBusinessAsync();
        await harness.SeedInvoiceAsync(businessId, customerId, dueInDays);
        await harness.SeedRuleAsync(businessId, triggerType, triggerValue);

        await harness.RunOnceAsync();

        Assert.Equal(expectSend ? 1 : 0, harness.EmailSender.Sent.Count);
    }
}
