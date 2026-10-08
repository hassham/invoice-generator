using InvoiceApp.Domain.Invoicing;
using Microsoft.EntityFrameworkCore;

namespace InvoiceApp.Infrastructure.Tests.Invoicing;

/// <summary>
/// IG-233 AC 1 ("a failed reminder send is retried a bounded number of times, not indefinitely")
/// and AC 2 ("a permanently failing reminder is surfaced, not silently dropped").
///
/// Both were broken, and both broke quietly. Before this, ten runs against a permanently failing
/// mail server produced ten send attempts and four failure rows cycling 3/3/3/1, of which exactly
/// one was visible to the user: the service marked a failure `IsResolved` once it hit MaxRetries,
/// and the failures list filters unresolved rows, so a failure vanished at the moment it became
/// permanent and a fresh row started counting again from one.
/// </summary>
public class ReminderFailureHandlingTests
{
    private static async Task<ReminderTestHarness> AlwaysFailingHarnessAsync(Action<int> onAttempt)
    {
        var harness = new ReminderTestHarness();
        var (businessId, customerId) = await harness.SeedBusinessAsync();
        await harness.SeedInvoiceAsync(businessId, customerId, dueInDays: -3);
        await harness.SeedRuleAsync(businessId, ReminderTriggerType.DaysOverdue, 3);

        var attempts = 0;
        harness.EmailSender.FailWith = _ =>
        {
            attempts++;
            onAttempt(attempts);
            return new InvalidOperationException("SMTP down");
        };

        return harness;
    }

    /// <summary>AC 1: the job must stop trying, not retry nightly forever.</summary>
    [Fact]
    public async Task Stops_attempting_a_reminder_once_its_retries_are_exhausted()
    {
        var attempts = 0;
        using var harness = await AlwaysFailingHarnessAsync(a => attempts = a);

        // Ten days of the job running against a permanently broken mail server.
        for (var day = 0; day < 10; day++)
        {
            await harness.RunOnceAsync();
        }

        // MaxRetries defaults to 3, so three attempts and then silence.
        Assert.Equal(3, attempts);
    }

    /// <summary>AC 2: and the failure must still be visible afterwards.</summary>
    [Fact]
    public async Task A_permanently_failing_reminder_stays_on_the_failures_list()
    {
        using var harness = await AlwaysFailingHarnessAsync(_ => { });

        for (var day = 0; day < 10; day++)
        {
            await harness.RunOnceAsync();
        }

        await using var db = harness.NewDbContext();
        var failure = Assert.Single(db.ReminderFailures);

        Assert.Equal(3, failure.RetryCount);
        // The list endpoint filters on this, so true here means "invisible to the user".
        Assert.False(failure.IsResolved);
        Assert.Contains("SMTP down", failure.FailureReason);
    }

    /// <summary>
    /// The specific regression: exhausting retries used to start a brand new failure row at 1, so
    /// the same broken reminder accumulated rows forever and never showed a true retry count.
    /// </summary>
    [Fact]
    public async Task Does_not_start_a_fresh_failure_row_once_retries_are_exhausted()
    {
        using var harness = await AlwaysFailingHarnessAsync(_ => { });

        for (var day = 0; day < 10; day++)
        {
            await harness.RunOnceAsync();
        }

        await using var db = harness.NewDbContext();
        var failures = await db.ReminderFailures.ToListAsync();

        Assert.Single(failures);
        Assert.Equal(new[] { 3 }, failures.Select(f => f.RetryCount).ToArray());
    }

    [Fact]
    public async Task Counts_each_failed_attempt_on_one_row()
    {
        using var harness = await AlwaysFailingHarnessAsync(_ => { });

        await harness.RunOnceAsync();
        await using (var afterFirst = harness.NewDbContext())
        {
            Assert.Equal(1, (await afterFirst.ReminderFailures.SingleAsync()).RetryCount);
        }

        await harness.RunOnceAsync();
        await using var afterSecond = harness.NewDbContext();
        Assert.Equal(2, (await afterSecond.ReminderFailures.SingleAsync()).RetryCount);
    }

    /// <summary>
    /// Resolving a failure is a human saying the underlying problem is fixed, so the reminder
    /// becomes eligible again - otherwise the only remedy for a transient outage that burned three
    /// retries would be editing the database.
    /// </summary>
    [Fact]
    public async Task Resolving_a_failure_makes_the_reminder_eligible_again()
    {
        var attempts = 0;
        using var harness = await AlwaysFailingHarnessAsync(a => attempts = a);

        for (var day = 0; day < 5; day++)
        {
            await harness.RunOnceAsync();
        }
        Assert.Equal(3, attempts);

        await using (var db = harness.NewDbContext())
        {
            var failure = await db.ReminderFailures.SingleAsync();
            failure.IsResolved = true;
            await db.SaveChangesAsync();
        }

        // The mail server is working again by the time the operator resolves it.
        harness.EmailSender.FailWith = null;
        await harness.RunOnceAsync();

        Assert.Single(harness.EmailSender.Sent);
    }

    /// <summary>Exhausting one reminder must not suppress a different, healthy one.</summary>
    [Fact]
    public async Task Exhausting_one_reminder_does_not_stop_another()
    {
        using var harness = new ReminderTestHarness();
        var (businessId, customerId) = await harness.SeedBusinessAsync();
        await harness.SeedInvoiceAsync(businessId, customerId, dueInDays: -3, invoiceNumber: "INV-BROKEN");
        await harness.SeedRuleAsync(businessId, ReminderTriggerType.DaysOverdue, 3);

        harness.EmailSender.FailWith = _ => new InvalidOperationException("SMTP down");
        for (var day = 0; day < 5; day++)
        {
            await harness.RunOnceAsync();
        }

        // A second invoice falls due only now, and the mail server is fine for it.
        harness.EmailSender.FailWith = null;
        await harness.SeedInvoiceAsync(businessId, customerId, dueInDays: -3, invoiceNumber: "INV-HEALTHY");
        await harness.RunOnceAsync();

        Assert.Single(harness.EmailSender.Sent);
        await using var db = harness.NewDbContext();
        Assert.Single(db.ReminderFailures);
    }
}
