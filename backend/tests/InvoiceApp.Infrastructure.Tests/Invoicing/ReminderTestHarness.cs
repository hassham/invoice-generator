using InvoiceApp.Application.Email;
using InvoiceApp.Domain.Businesses;
using InvoiceApp.Domain.Customers;
using InvoiceApp.Domain.Invoicing;
using InvoiceApp.Infrastructure.Invoicing;
using InvoiceApp.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;

namespace InvoiceApp.Infrastructure.Tests.Invoicing;

/// <summary>
/// Captures every email the reminder job tries to send, so a test can assert on how many went out
/// and to whom - the thing that actually matters about a job whose job is sending email.
/// </summary>
public sealed class CapturingEmailSender : IEmailSender
{
    public List<EmailMessage> Sent { get; } = [];

    /// <summary>Set to make the next send throw, for exercising the failure path.</summary>
    public Func<EmailMessage, Exception?>? FailWith { get; set; }

    public Task SendAsync(EmailMessage message, CancellationToken cancellationToken)
    {
        if (FailWith?.Invoke(message) is { } failure)
        {
            throw failure;
        }

        Sent.Add(message);
        return Task.CompletedTask;
    }
}

/// <summary>
/// IG-286: builds the reminder job against a real <see cref="ApplicationDbContext"/> (InMemory) and
/// a capturing email sender, mirroring the production wiring minus Npgsql and SMTP - the same
/// approach as AuthenticationTestHarness.
///
/// Before this, nothing in the suite exercised <see cref="ReminderSendingService"/> at all, despite
/// it emailing real customers on a daily timer.
/// </summary>
public sealed class ReminderTestHarness : IDisposable
{
    private readonly ServiceProvider provider;

    public ReminderTestHarness()
    {
        // The database name is computed once, outside the options lambda. That lambda runs for
        // every DbContext instance, so calling Guid.NewGuid() inside it gives each context its own
        // isolated store - the seed data would be invisible to the job under test.
        var databaseName = Guid.NewGuid().ToString();

        var services = new ServiceCollection();
        services.AddDbContext<ApplicationDbContext>(options =>
            options.UseInMemoryDatabase(databaseName));
        services.AddSingleton<IEmailSender>(EmailSender);
        provider = services.BuildServiceProvider();

        Service = new ReminderSendingService(provider, NullLogger<ReminderSendingService>.Instance);
    }

    public CapturingEmailSender EmailSender { get; } = new();

    public ReminderSendingService Service { get; }

    public ApplicationDbContext NewDbContext() =>
        provider.CreateScope().ServiceProvider.GetRequiredService<ApplicationDbContext>();

    /// <summary>Runs exactly one pass of the job, as the 03:00 timer would.</summary>
    public Task RunOnceAsync() => Service.ProcessRemindersAsync(CancellationToken.None);

    public async Task<(Guid BusinessId, Guid CustomerId)> SeedBusinessAsync(string email = "customer@example.com")
    {
        await using var db = NewDbContext();

        var business = new Business
        {
            Id = Guid.NewGuid(),
            UserId = Guid.NewGuid(),
            BusinessName = "Northwind Trading",
            Country = "AU",
            DefaultCurrency = "AUD",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };

        var customer = new Customer
        {
            Id = Guid.NewGuid(),
            BusinessId = business.Id,
            BusinessName = "Acme Pty Ltd",
            Email = email,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };

        db.Businesses.Add(business);
        db.Customers.Add(customer);
        await db.SaveChangesAsync();

        return (business.Id, customer.Id);
    }

    /// <summary>An invoice due <paramref name="dueInDays"/> days from today - negative for overdue.</summary>
    public async Task<Guid> SeedInvoiceAsync(
        Guid businessId,
        Guid customerId,
        int dueInDays,
        InvoiceStatus status = InvoiceStatus.Sent,
        string invoiceNumber = "INV-1")
    {
        await using var db = NewDbContext();

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var invoice = new Invoice
        {
            Id = Guid.NewGuid(),
            BusinessId = businessId,
            CustomerId = customerId,
            InvoiceNumber = invoiceNumber,
            Status = status,
            IssueDate = today.AddDays(-30),
            DueDate = today.AddDays(dueInDays),
            Currency = "AUD",
            CustomerSnapshot = "{}",
            SellerSnapshot = "{}",
            Subtotal = 100,
            TotalAmount = 100,
            AmountDue = 100,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };

        db.Invoices.Add(invoice);
        await db.SaveChangesAsync();
        return invoice.Id;
    }

    public async Task<Guid> SeedRuleAsync(
        Guid businessId,
        ReminderTriggerType triggerType,
        int triggerValue,
        string subject = "Reminder",
        bool isActive = true)
    {
        await using var db = NewDbContext();

        var rule = new ReminderRule
        {
            Id = Guid.NewGuid(),
            BusinessId = businessId,
            TriggerType = triggerType,
            TriggerValue = triggerValue,
            EmailSubject = subject,
            EmailBody = "Body",
            IsActive = isActive,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };

        db.ReminderRules.Add(rule);
        await db.SaveChangesAsync();
        return rule.Id;
    }

    /// <summary>
    /// Seeds the real FSD default rule set (3 days before due, on due, 3/7/14 days overdue) through
    /// the production service rather than hand-rolling it, so a test covering "all configured
    /// rules" covers the rules a real business actually gets.
    /// </summary>
    public async Task SeedDefaultRulesAsync(Guid businessId)
    {
        await using var db = NewDbContext();
        await new ReminderRuleService(db).InitializeDefaultRulesAsync(businessId, CancellationToken.None);
    }

    public async Task SetInvoiceStatusAsync(Guid invoiceId, InvoiceStatus status)
    {
        await using var db = NewDbContext();
        var invoice = await db.Invoices.SingleAsync(i => i.Id == invoiceId);
        invoice.Status = status;
        await db.SaveChangesAsync();
    }

    /// <summary>
    /// Moves an invoice onto a different rule's trigger day. The job reads the clock directly, so
    /// advancing the invoice is how a test covers "a later reminder" without faking time.
    /// </summary>
    public async Task ShiftDueDateAsync(Guid invoiceId, int dueInDays)
    {
        await using var db = NewDbContext();
        var invoice = await db.Invoices.SingleAsync(i => i.Id == invoiceId);
        invoice.DueDate = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(dueInDays);
        await db.SaveChangesAsync();
    }

    public async Task SoftDeleteInvoiceAsync(Guid invoiceId)
    {
        await using var db = NewDbContext();
        var invoice = await db.Invoices.SingleAsync(i => i.Id == invoiceId);
        invoice.IsDeleted = true;
        invoice.DeletedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();
    }

    public async Task<int> SentReminderCountAsync()
    {
        await using var db = NewDbContext();
        return await db.RemindersSent.CountAsync();
    }

    public void Dispose() => provider.Dispose();
}
