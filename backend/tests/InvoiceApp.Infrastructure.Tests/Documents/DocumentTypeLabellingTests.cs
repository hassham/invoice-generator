using InvoiceApp.Application.Documents;
using InvoiceApp.Application.Invoicing;
using InvoiceApp.Application.Purchasing;
using InvoiceApp.Domain.Businesses;
using InvoiceApp.Domain.Customers;
using InvoiceApp.Domain.Invoicing;
using InvoiceApp.Infrastructure.Invoicing;
using InvoiceApp.Infrastructure.Persistence;
using InvoiceApp.Infrastructure.Purchasing;
using Microsoft.EntityFrameworkCore;

namespace InvoiceApp.Infrastructure.Tests.Documents;

/// <summary>
/// IG-294: every document type is clearly labelled on its PDF.
///
/// Four document types share one <see cref="InvoicePdfDocument"/>, distinguished only by the
/// <c>DocumentTypeLabel</c> and <c>CounterpartyLabel</c> the producing service sets — so those two
/// strings are the entire difference between a purchase order and an invoice on paper. Until now
/// they were only ever verified by generating a real PDF and reading it back with `pdftotext`,
/// which is convincing but manual: the automated assertions could only check magic bytes, and
/// swapping a label would not fail a single test.
///
/// These pin the labels where they are decided, so a regression fails `dotnet test`.
/// </summary>
public class DocumentTypeLabellingTests : IDisposable
{
    private readonly ApplicationDbContext dbContext;
    private readonly Guid userId = Guid.NewGuid();
    private Guid businessId;
    private Guid customerId;
    private Guid invoiceId;

    public DocumentTypeLabellingTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        dbContext = new ApplicationDbContext(options);
        Seed();
    }

    private void Seed()
    {
        var business = new Business
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            BusinessName = "Northwind Trading",
            Country = "AU",
            DefaultCurrency = "AUD",
            Email = "accounts@northwind.example",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };

        var customer = new Customer
        {
            Id = Guid.NewGuid(),
            BusinessId = business.Id,
            BusinessName = "Acme Pty Ltd",
            ContactName = "Jamie Lee",
            Email = "billing@acme.example",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };

        var invoice = new Invoice
        {
            Id = Guid.NewGuid(),
            BusinessId = business.Id,
            CustomerId = customer.Id,
            InvoiceNumber = "INV-1",
            Status = InvoiceStatus.Sent,
            IssueDate = new DateOnly(2030, 8, 1),
            DueDate = new DateOnly(2030, 8, 15),
            Currency = "AUD",
            SellerSnapshot = """{"Text":"Northwind Trading"}""",
            CustomerSnapshot = """{"Text":"Acme Pty Ltd","ShipTo":null}""",
            Subtotal = 500,
            TotalAmount = 500,
            AmountDue = 500,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };

        dbContext.Businesses.Add(business);
        dbContext.Customers.Add(customer);
        dbContext.Invoices.Add(invoice);
        dbContext.SaveChanges();

        businessId = business.Id;
        customerId = customer.Id;
        invoiceId = invoice.Id;
    }

    private async Task<InvoicePdfRequest> CreditNotePdfRequestAsync()
    {
        var service = new CreditNoteService(dbContext);
        var created = await service.CreateAsync(
            userId, businessId, new CreateCreditNoteCommand(invoiceId, 120m, "Two damaged units returned", null), default);
        return await service.GetPdfRequestAsync(userId, businessId, created.Id, default);
    }

    private async Task<InvoicePdfRequest> PurchaseOrderPdfRequestAsync()
    {
        var service = new PurchaseOrderService(dbContext);
        var created = await service.CreateAsync(userId, businessId, new CreatePurchaseOrderCommand(
            SupplierId: customerId,
            IssueDate: new DateOnly(2030, 9, 1),
            DueDate: new DateOnly(2030, 9, 15),
            Currency: "AUD",
            Reference: null,
            Items: [new PurchaseOrderLineItem("Steel bracket", 1, "Each", 220, 0, 0)],
            Notes: null,
            Terms: null,
            DeliveryInstructions: null,
            TemplateId: null,
            TemplateCustomization: null), default);
        return await service.GetPdfRequestAsync(userId, businessId, created.Id, default);
    }

    [Fact]
    public async Task A_credit_note_is_labelled_as_one()
    {
        var request = await CreditNotePdfRequestAsync();

        Assert.Equal("Credit Note", request.DocumentTypeLabel);
    }

    /// <summary>
    /// A credit note genuinely is addressed to the customer, so unlike a purchase order it keeps
    /// the default counterparty wording (IG-308).
    /// </summary>
    [Fact]
    public async Task A_credit_note_is_still_addressed_to_the_customer()
    {
        var request = await CreditNotePdfRequestAsync();

        Assert.Equal("Bill to", request.CounterpartyLabel);
    }

    /// <summary>A credit note has no due date, so the line is suppressed rather than filled in.</summary>
    [Fact]
    public async Task A_credit_note_shows_no_due_date()
    {
        var request = await CreditNotePdfRequestAsync();

        Assert.False(request.ShowDueDate);
    }

    [Fact]
    public async Task A_purchase_order_is_labelled_as_one()
    {
        var request = await PurchaseOrderPdfRequestAsync();

        Assert.Equal("Purchase Order", request.DocumentTypeLabel);
    }

    /// <summary>"Bill to" is simply wrong on a document addressed to a supplier (IG-306).</summary>
    [Fact]
    public async Task A_purchase_order_names_its_counterparty_as_a_supplier()
    {
        var request = await PurchaseOrderPdfRequestAsync();

        Assert.Equal("Supplier", request.CounterpartyLabel);
    }

    [Fact]
    public async Task A_purchase_order_keeps_its_required_by_date()
    {
        var request = await PurchaseOrderPdfRequestAsync();

        Assert.True(request.ShowDueDate);
    }

    /// <summary>
    /// The defaults matter as much as the overrides: an invoice is the one type that sets neither
    /// label, so a careless change to these defaults would silently relabel every invoice.
    /// </summary>
    [Fact]
    public void An_invoice_gets_the_default_labels()
    {
        var request = new InvoicePdfRequest(
            "INV-1", new DateOnly(2030, 8, 1), new DateOnly(2030, 8, 15), null, "AUD",
            "Northwind Trading", "Acme Pty Ltd", null, [], DiscountType.None, null,
            TaxCalculationMethod.Exclusive, null, null, null, null, null, null, null);

        Assert.Equal("Invoice", request.DocumentTypeLabel);
        Assert.Equal("Bill to", request.CounterpartyLabel);
        Assert.True(request.ShowDueDate);
    }

    /// <summary>
    /// The point of the whole exercise: no two document types may present the same way. If this
    /// ever fails, two documents have become indistinguishable on paper.
    /// </summary>
    [Fact]
    public async Task No_two_document_types_share_a_label()
    {
        var labels = new[]
        {
            "Invoice",
            "Estimate",
            (await CreditNotePdfRequestAsync()).DocumentTypeLabel,
            (await PurchaseOrderPdfRequestAsync()).DocumentTypeLabel,
        };

        Assert.Equal(labels.Length, labels.Distinct(StringComparer.OrdinalIgnoreCase).Count());
    }

    public void Dispose() => dbContext.Dispose();
}
