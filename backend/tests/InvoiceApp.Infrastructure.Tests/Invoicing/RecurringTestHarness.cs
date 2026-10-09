using InvoiceApp.Application.Invoicing;
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
/// Stands in for the real dispatcher, which lives in the Api project and renders a PDF. Records
/// what the job asked to send so a test can assert on it, and can be made to throw.
/// </summary>
public sealed class CapturingInvoiceEmailDispatcher : IInvoiceEmailDispatcher
{
    public List<(Guid UserId, Guid InvoiceId, InvoiceEmailRequest Request)> Sent { get; } = [];

    public Func<Guid, Exception?>? FailWith { get; set; }

    public Task SendAsync(Guid userId, Guid invoiceId, InvoiceEmailRequest request, CancellationToken cancellationToken)
    {
        if (FailWith?.Invoke(invoiceId) is { } failure)
        {
            throw failure;
        }

        Sent.Add((userId, invoiceId, request));
        return Task.CompletedTask;
    }
}

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
        services.AddSingleton<IInvoiceEmailDispatcher>(Dispatcher);
        provider = services.BuildServiceProvider();

        Service = new RecurringInvoiceGenerationService(
            provider, NullLogger<RecurringInvoiceGenerationService>.Instance);
    }

    public RecurringInvoiceGenerationService Service { get; }

    public CapturingInvoiceEmailDispatcher Dispatcher { get; } = new();

    /// <summary>The user who owns the seeded business — the identity an automatic send runs as.</summary>
    public Guid OwnerUserId { get; private set; }

    /// <summary>Makes the next generation attempt for this schedule fail, by removing its template.</summary>
    public async Task BreakTemplateAsync()
    {
        await using var db = NewDbContext();
        var template = await db.Invoices.SingleAsync(i => i.Id == TemplateInvoiceId);
        template.IsDeleted = true;
        await db.SaveChangesAsync();
    }

    public async Task RestoreTemplateAsync()
    {
        await using var db = NewDbContext();
        var template = await db.Invoices.SingleAsync(i => i.Id == TemplateInvoiceId);
        template.IsDeleted = false;
        await db.SaveChangesAsync();
    }

    public async Task ClearCustomerEmailAsync()
    {
        await using var db = NewDbContext();
        var customer = await db.Customers.SingleAsync(c => c.Id == CustomerId);
        customer.Email = null;
        await db.SaveChangesAsync();
    }

    public async Task<List<RecurringGenerationFailure>> FailuresAsync()
    {
        await using var db = NewDbContext();
        return await db.RecurringGenerationFailures.ToListAsync();
    }

    public async Task ResolveFailuresAsync()
    {
        await using var db = NewDbContext();
        foreach (var failure in await db.RecurringGenerationFailures.ToListAsync())
        {
            failure.IsResolved = true;
        }
        await db.SaveChangesAsync();
    }

    public async Task<DateOnly> NextRunDateAsync(Guid scheduleId)
    {
        await using var db = NewDbContext();
        return (await db.RecurringSchedules.SingleAsync(rs => rs.Id == scheduleId)).NextRunDate;
    }

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
        OwnerUserId = business.UserId;
    }

    /// <summary>Puts a per-line discount on the template's single line (IG-312).</summary>
    public async Task DiscountTemplateLineAsync(decimal discount)
    {
        await using var db = NewDbContext();
        var item = await db.InvoiceItems.SingleAsync(i => i.InvoiceId == TemplateInvoiceId);
        item.Discount = discount;

        var lineSubtotal = (item.Quantity * item.UnitPrice) - discount;
        item.LineSubtotal = lineSubtotal;
        item.TaxAmount = lineSubtotal * (item.TaxRate / 100m);
        item.LineTotal = item.LineSubtotal + item.TaxAmount;

        var invoice = await db.Invoices.SingleAsync(i => i.Id == TemplateInvoiceId);
        invoice.Subtotal = item.LineSubtotal;
        invoice.TaxAmount = item.TaxAmount;
        invoice.TotalAmount = item.LineTotal;
        invoice.AmountDue = item.LineTotal;

        await db.SaveChangesAsync();
    }

    /// <summary>
    /// Makes the template's stored header totals disagree with its own lines, so a test can prove
    /// generation recalculates rather than copying them.
    /// </summary>
    public async Task CorruptTemplateTotalsAsync(decimal total)
    {
        await using var db = NewDbContext();
        var invoice = await db.Invoices.SingleAsync(i => i.Id == TemplateInvoiceId);
        invoice.Subtotal = total;
        invoice.TaxAmount = total;
        invoice.TotalAmount = total;
        invoice.AmountDue = total;
        await db.SaveChangesAsync();
    }

    public async Task AddTemplateLineAsync(
        string description,
        decimal quantity,
        string? unit,
        decimal unitPrice,
        decimal taxRate,
        int sortOrder)
    {
        await using var db = NewDbContext();

        var lineSubtotal = quantity * unitPrice;
        var taxAmount = lineSubtotal * (taxRate / 100m);

        db.InvoiceItems.Add(new InvoiceItem
        {
            Id = Guid.NewGuid(),
            InvoiceId = TemplateInvoiceId,
            Description = description,
            Quantity = quantity,
            Unit = unit,
            UnitPrice = unitPrice,
            TaxRate = taxRate,
            Discount = 0,
            LineSubtotal = lineSubtotal,
            TaxAmount = taxAmount,
            LineTotal = lineSubtotal + taxAmount,
            SortOrder = sortOrder,
        });

        await db.SaveChangesAsync();
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
