using Microsoft.EntityFrameworkCore;

namespace InvoiceApp.Infrastructure.Tests.Invoicing;

/// <summary>
/// IG-311 / IG-230 AC 2 and AC 3 — the two criteria that were never built.
///
/// <c>AutoSend</c> was persisted, accepted on create and returned in the DTO, but the generation
/// job never read it: switching Automatic Send on did nothing at all, which is worse than a
/// missing feature because the UI implies it works. And a generation failure was written to the
/// log and nowhere else, so a schedule failing every night was invisible to the person being
/// under-billed.
/// </summary>
public class RecurringAutoSendAndFailureTests
{
    // ---- AC 2: Automatic Send ------------------------------------------------------------

    [Fact]
    public async Task Sends_the_generated_invoice_when_automatic_send_is_on()
    {
        using var harness = new RecurringTestHarness();
        await harness.SeedAsync();
        await harness.SeedDueScheduleAsync(autoSend: true);

        await harness.RunOnceAsync();

        var generated = Assert.Single(await harness.GeneratedInvoicesAsync());
        var sent = Assert.Single(harness.Dispatcher.Sent);

        Assert.Equal(generated.Id, sent.InvoiceId);
        // Sent as the account that owns the schedule - a background job has no signed-in user.
        Assert.Equal(harness.OwnerUserId, sent.UserId);
        Assert.Equal("billing@acme.example", Assert.Single(sent.Request.To));
        Assert.Contains(generated.InvoiceNumber, sent.Request.Subject);
    }

    [Fact]
    public async Task Sends_nothing_when_automatic_send_is_off()
    {
        using var harness = new RecurringTestHarness();
        await harness.SeedAsync();
        await harness.SeedDueScheduleAsync(autoSend: false);

        await harness.RunOnceAsync();

        Assert.Single(await harness.GeneratedInvoicesAsync());
        Assert.Empty(harness.Dispatcher.Sent);
    }

    /// <summary>
    /// The invoice is validly created whether or not the email goes out, so a send failure must
    /// not undo the generation. The dispatcher records the failure against the invoice's own email
    /// history, which is where an email problem belongs.
    /// </summary>
    [Fact]
    public async Task A_failed_send_does_not_undo_the_generated_invoice()
    {
        using var harness = new RecurringTestHarness();
        await harness.SeedAsync();
        await harness.SeedDueScheduleAsync(autoSend: true);
        harness.Dispatcher.FailWith = _ => new InvalidOperationException("SMTP down");

        await harness.RunOnceAsync();

        Assert.Single(await harness.GeneratedInvoicesAsync());
        // An email problem is not a generation problem.
        Assert.Empty(await harness.FailuresAsync());
    }

    [Fact]
    public async Task A_customer_with_no_email_address_still_gets_an_invoice_generated()
    {
        using var harness = new RecurringTestHarness();
        await harness.SeedAsync();
        await harness.ClearCustomerEmailAsync();
        await harness.SeedDueScheduleAsync(autoSend: true);

        await harness.RunOnceAsync();

        Assert.Single(await harness.GeneratedInvoicesAsync());
        Assert.Empty(harness.Dispatcher.Sent);
    }

    [Fact]
    public async Task Each_period_sends_its_own_invoice()
    {
        using var harness = new RecurringTestHarness();
        await harness.SeedAsync();
        var scheduleId = await harness.SeedDueScheduleAsync(autoSend: true);

        await harness.RunOnceAsync();
        await harness.MakeDueAsync(scheduleId);
        await harness.RunOnceAsync();

        var generated = await harness.GeneratedInvoicesAsync();
        Assert.Equal(2, generated.Count);
        Assert.Equal(2, harness.Dispatcher.Sent.Count);
        Assert.Equal(
            generated.Select(i => i.Id).OrderBy(id => id),
            harness.Dispatcher.Sent.Select(s => s.InvoiceId).OrderBy(id => id));
    }

    // ---- AC 3: failures are visible and bounded -------------------------------------------

    /// <summary>
    /// The most likely real cause of a broken schedule: somebody deleted the invoice it generates
    /// from. This used to log a warning and return, leaving no record at all.
    /// </summary>
    [Fact]
    public async Task Records_a_failure_when_the_template_invoice_is_gone()
    {
        using var harness = new RecurringTestHarness();
        await harness.SeedAsync();
        var scheduleId = await harness.SeedDueScheduleAsync();
        await harness.BreakTemplateAsync();

        await harness.RunOnceAsync();

        Assert.Empty(await harness.GeneratedInvoicesAsync());
        var failure = Assert.Single(await harness.FailuresAsync());
        Assert.Equal(scheduleId, failure.RecurringScheduleId);
        Assert.Equal(1, failure.RetryCount);
        Assert.False(failure.IsResolved);
        Assert.Contains("no longer exists", failure.FailureReason);
    }

    /// <summary>
    /// The decision recorded on IG-311: a failed run does **not** advance NextRunDate. Advancing it
    /// would silently skip a billing period on a transient failure.
    /// </summary>
    [Fact]
    public async Task A_failed_run_does_not_skip_the_billing_period()
    {
        using var harness = new RecurringTestHarness();
        await harness.SeedAsync();
        var scheduleId = await harness.SeedDueScheduleAsync();
        var dueBefore = await harness.NextRunDateAsync(scheduleId);
        await harness.BreakTemplateAsync();

        await harness.RunOnceAsync();

        Assert.Equal(dueBefore, await harness.NextRunDateAsync(scheduleId));
    }

    [Fact]
    public async Task Stops_attempting_a_schedule_once_its_retries_are_exhausted()
    {
        using var harness = new RecurringTestHarness();
        await harness.SeedAsync();
        await harness.SeedDueScheduleAsync();
        await harness.BreakTemplateAsync();

        for (var day = 0; day < 10; day++)
        {
            await harness.RunOnceAsync();
        }

        var failure = Assert.Single(await harness.FailuresAsync());
        // MaxRetries defaults to 3 - it stops counting there rather than climbing to 10.
        Assert.Equal(3, failure.RetryCount);
    }

    /// <summary>The IG-233 lesson: a permanent failure must stay visible, not be marked resolved.</summary>
    [Fact]
    public async Task A_permanently_failing_schedule_stays_on_the_failures_list()
    {
        using var harness = new RecurringTestHarness();
        await harness.SeedAsync();
        await harness.SeedDueScheduleAsync();
        await harness.BreakTemplateAsync();

        for (var day = 0; day < 10; day++)
        {
            await harness.RunOnceAsync();
        }

        var failure = Assert.Single(await harness.FailuresAsync());
        Assert.False(failure.IsResolved);
    }

    [Fact]
    public async Task Resolving_a_failure_makes_the_schedule_generate_again()
    {
        using var harness = new RecurringTestHarness();
        await harness.SeedAsync();
        var scheduleId = await harness.SeedDueScheduleAsync();
        await harness.BreakTemplateAsync();

        for (var day = 0; day < 5; day++)
        {
            await harness.RunOnceAsync();
        }
        Assert.Empty(await harness.GeneratedInvoicesAsync());

        await harness.RestoreTemplateAsync();
        await harness.ResolveFailuresAsync();
        await harness.MakeDueAsync(scheduleId);
        await harness.RunOnceAsync();

        Assert.Single(await harness.GeneratedInvoicesAsync());
    }

    /// <summary>A run that succeeds closes out the old failure, so the list shows what is broken now.</summary>
    [Fact]
    public async Task A_successful_run_resolves_an_earlier_failure()
    {
        using var harness = new RecurringTestHarness();
        await harness.SeedAsync();
        var scheduleId = await harness.SeedDueScheduleAsync();

        await harness.BreakTemplateAsync();
        await harness.RunOnceAsync();
        Assert.Single(await harness.FailuresAsync());

        await harness.RestoreTemplateAsync();
        await harness.MakeDueAsync(scheduleId);
        await harness.RunOnceAsync();

        Assert.Single(await harness.GeneratedInvoicesAsync());
        var failure = Assert.Single(await harness.FailuresAsync());
        Assert.True(failure.IsResolved);
    }

    [Fact]
    public async Task One_failing_schedule_does_not_stop_a_healthy_one()
    {
        using var harness = new RecurringTestHarness();
        await harness.SeedAsync();
        var failingId = await harness.SeedDueScheduleAsync();

        // Break the shared template, run until the failing schedule is exhausted, then restore it
        // and add a second schedule that should generate normally.
        await harness.BreakTemplateAsync();
        for (var day = 0; day < 5; day++)
        {
            await harness.RunOnceAsync();
        }
        await harness.RestoreTemplateAsync();

        var healthyId = await harness.SeedDueScheduleAsync();
        await harness.MakeDueAsync(failingId);
        await harness.RunOnceAsync();

        // Only the healthy schedule generated; the exhausted one is still being skipped.
        Assert.Single(await harness.GeneratedInvoicesAsync());
        await using var db = harness.NewDbContext();
        var healthy = await db.RecurringSchedules.SingleAsync(rs => rs.Id == healthyId);
        Assert.True(healthy.NextRunDate > DateOnly.FromDateTime(DateTime.UtcNow));
    }
}
