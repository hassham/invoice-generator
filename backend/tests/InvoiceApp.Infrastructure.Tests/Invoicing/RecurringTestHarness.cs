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
/// IG-282: drives the recurring invoice generation job against a real
/// <see cref="ApplicationDbContext"/> (InMemory), the same shape as <see cref="ReminderTestHarness"/>.
///
/// The job reads <c>DateTime.UtcNow</c> directly, so a test moves the schedule's
/// <c>NextRunDate</c> rather than the clock to make a run due.
/// </summary>
public sealed class RecurringTestHarness : IDisposable
{
    private readonly ServiceProvider provider;

    public RecurringTestHarness()
    {
        // Computed once, outside the lambda - see ReminderTestHarness for why.
        var databaseName = Guid.NewGuid().ToString();

        var services = new ServiceCollection();
        services.AddDbContext<ApplicationDbContext>(options =>
            options.UseInMemoryDatabase(databaseName));
        provider = services.BuildServiceProvider();

        Service = new RecurringInvoiceGenerationService(
            provider, NullLogger<RecurringInvoiceGenerationService>.Instance);
    }

    public RecurringInvoiceGenerationService Service { get; }

    public ApplicationDbContext NewDbContext() =>
        provider.CreateScope().ServiceProvider.GetRequiredService<ApplicationDbContext>();

    /// <summary>Runs exactly one pass of the job, as the 02:00 timer would.</summary>
    public Task RunOnceAsync() => Service.ProcessRecurringSchedulesAsync(CancellationToken.None);

    public Guid BusinessId { get; private set; }

    public Guid CustomerId { get; private set; }

    public Guid TemplateInvoiceId { get; private set; }

    /// <summary>Seeds a business, a customer and a template invoice with one line item.</summary>
    public async Task SeedAsync()
    {
        await using var db = NewDbContext();

        var business = new Business
        {
            Id = Guid.NewGuid(),
            UserId = Guid.NewGuid(),
            BusinessName = "Northwind Trading",
            Country = "AU",
            DefaultCurrency = "AUD",
            DefaultPaymentTerms = PaymentTermsOption.Net30,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };

        var customer = new Customer
        {
            Id = Guid.NewGuid(),
            BusinessId = business.Id,
            BusinessName = "Acme Pty Ltd",
            Email = "billing@acme.example",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };

        var template = new Invoice
        {
            Id = Guid.NewGuid(),
            BusinessId = business.Id,
            CustomerId = customer.Id,
            InvoiceNumber = "INV-TEMPLATE",
            Status = InvoiceStatus.Sent,
            IssueDate = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(-30),
            DueDate = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(-16),
            Currency = "AUD",
            CustomerSnapshot = "{}",
            SellerSnapshot = "{}",
            Subtotal = 500,
            TaxAmount = 50,
            TotalAmount = 550,
            AmountDue = 550,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };

        template.Items.Add(new InvoiceItem
        {
            Id = Guid.NewGuid(),
            InvoiceId = template.Id,
            Description = "Monthly retainer",
            Quantity = 1,
            Unit = "Month",
            UnitPrice = 500,
            TaxRate = 10,
            Discount = 0,
            LineSubtotal = 500,
            TaxAmount = 50,
            LineTotal = 550,
            SortOrder = 0,
        });

        db.Businesses.Add(business);
        db.Customers.Add(customer);
        db.Invoices.Add(template);
        await db.SaveChangesAsync();

        BusinessId = business.Id;
        CustomerId = customer.Id;
        TemplateInvoiceId = template.Id;
    }

    /// <summary>A schedule already due to run today.</summary>
    public async Task<Guid> SeedDueScheduleAsync(
        RecurringScheduleFrequency frequency = RecurringScheduleFrequency.Monthly,
        bool autoSend = false)
    {
        await using var db = NewDbContext();

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var schedule = new RecurringSchedule
        {
            Id = Guid.NewGuid(),
            BusinessId = BusinessId,
            CustomerId = CustomerId,
            InvoiceTemplateId = TemplateInvoiceId,
            Frequency = frequency,
            StartDate = today,
            NextRunDate = today,
            AutoSend = autoSend,
            IsActive = true,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };

        db.RecurringSchedules.Add(schedule);
        await db.SaveChangesAsync();
        return schedule.Id;
    }

    /// <summary>Makes a schedule due again, standing in for time passing.</summary>
    public async Task MakeDueAsync(Guid scheduleId)
    {
        await using var db = NewDbContext();
        var schedule = await db.RecurringSchedules.SingleAsync(rs => rs.Id == scheduleId);
        schedule.NextRunDate = DateOnly.FromDateTime(DateTime.UtcNow);
        await db.SaveChangesAsync();
    }

    public async Task PauseAsync(Guid scheduleId) => await UpdateScheduleAsync(scheduleId, s => s.IsActive = false);

    public async Task ResumeAsync(Guid scheduleId) => await UpdateScheduleAsync(scheduleId, s => s.IsActive = true);

    public async Task CancelAsync(Guid scheduleId) => await UpdateScheduleAsync(scheduleId, s =>
    {
        s.IsDeleted = true;
        s.IsActive = false;
        s.DeletedAt = DateTimeOffset.UtcNow;
    });

    private async Task UpdateScheduleAsync(Guid scheduleId, Action<RecurringSchedule> change)
    {
        await using var db = NewDbContext();
        var schedule = await db.RecurringSchedules.SingleAsync(rs => rs.Id == scheduleId);
        change(schedule);
        schedule.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();
    }

    /// <summary>Every invoice the job has generated, newest first. Excludes the template.</summary>
    public async Task<List<Invoice>> GeneratedInvoicesAsync()
    {
        await using var db = NewDbContext();
        return await db.Invoices
            .Include(i => i.Items)
            .Where(i => i.Id != TemplateInvoiceId)
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync();
    }

    public void Dispose() => provider.Dispose();
}
