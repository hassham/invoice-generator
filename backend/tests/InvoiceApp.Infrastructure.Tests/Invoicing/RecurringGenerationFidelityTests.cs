using InvoiceApp.Domain.Invoicing;
using Microsoft.EntityFrameworkCore;

namespace InvoiceApp.Infrastructure.Tests.Invoicing;

/// <summary>
/// IG-312 / IG-230 AC 1: an invoice generated from a schedule carries the template's line items in
/// full, and its line figures add up to its own header.
///
/// The regression these exist for: generation copied only Description, Quantity, UnitPrice,
/// TaxRate and SortOrder, so a template line of
/// <c>Unit=Month Discount=0 LineSubtotal=500 TaxAmount=50 LineTotal=550</c> generated as
/// <c>Unit=null Discount=0 LineSubtotal=0 TaxAmount=0 LineTotal=0</c> while the header kept the
/// template's <c>Subtotal=500 Tax=50 Total=550</c>. The dropped per-line discount meant a customer
/// on a discounted retainer was billed the full price, silently, every period. Nothing caught it
/// because the header totals were copied across and therefore always looked right.
/// </summary>
public class RecurringGenerationFidelityTests
{
    private static async Task<(RecurringTestHarness Harness, Invoice Generated)> GenerateAsync()
    {
        var harness = new RecurringTestHarness();
        await harness.SeedAsync();
        await harness.SeedDueScheduleAsync();
        await harness.RunOnceAsync();

        return (harness, Assert.Single(await harness.GeneratedInvoicesAsync()));
    }

    [Fact]
    public async Task Carries_every_line_item_field_from_the_template()
    {
        var (harness, generated) = await GenerateAsync();
        using var _h = harness;

        await using var db = harness.NewDbContext();
        var templateItem = await db.InvoiceItems.SingleAsync(i => i.InvoiceId == harness.TemplateInvoiceId);
        var generatedItem = Assert.Single(generated.Items);

        Assert.Equal(templateItem.Description, generatedItem.Description);
        Assert.Equal(templateItem.Quantity, generatedItem.Quantity);
        Assert.Equal(templateItem.Unit, generatedItem.Unit);
        Assert.Equal(templateItem.UnitPrice, generatedItem.UnitPrice);
        Assert.Equal(templateItem.TaxRate, generatedItem.TaxRate);
        Assert.Equal(templateItem.Discount, generatedItem.Discount);
        Assert.Equal(templateItem.SortOrder, generatedItem.SortOrder);
        Assert.Equal(templateItem.SourceItemId, generatedItem.SourceItemId);
    }

    /// <summary>The specific symptom: line figures were all zero.</summary>
    [Fact]
    public async Task Gives_the_generated_line_real_figures()
    {
        var (harness, generated) = await GenerateAsync();
        using var _h = harness;

        var item = Assert.Single(generated.Items);

        Assert.Equal(500m, item.LineSubtotal);
        Assert.Equal(50m, item.TaxAmount);
        Assert.Equal(550m, item.LineTotal);
    }

    /// <summary>
    /// The invariant that makes the whole document coherent, and the one the old code broke: the
    /// lines have to add up to the header.
    /// </summary>
    [Fact]
    public async Task Line_figures_add_up_to_the_invoice_header()
    {
        var (harness, generated) = await GenerateAsync();
        using var _h = harness;

        Assert.Equal(generated.Subtotal, generated.Items.Sum(i => i.LineSubtotal));
        Assert.Equal(generated.TaxAmount, generated.Items.Sum(i => i.TaxAmount));
        Assert.Equal(generated.TotalAmount, generated.Items.Sum(i => i.LineTotal));
    }

    /// <summary>
    /// The billing-correctness case. A discounted retainer must generate at the discounted price,
    /// not the list price.
    /// </summary>
    [Fact]
    public async Task Honours_a_per_line_discount()
    {
        using var harness = new RecurringTestHarness();
        await harness.SeedAsync();
        await harness.DiscountTemplateLineAsync(100m);
        await harness.SeedDueScheduleAsync();

        await harness.RunOnceAsync();

        var generated = Assert.Single(await harness.GeneratedInvoicesAsync());
        var item = Assert.Single(generated.Items);

        // 1 x 500 less a 100 discount = 400, plus 10% tax = 440.
        Assert.Equal(100m, item.Discount);
        Assert.Equal(400m, item.LineSubtotal);
        Assert.Equal(40m, item.TaxAmount);
        Assert.Equal(440m, item.LineTotal);
        Assert.Equal(440m, generated.TotalAmount);
        Assert.Equal(440m, generated.AmountDue);
    }

    /// <summary>
    /// Totals are recalculated rather than copied, so a template whose stored totals have gone
    /// stale cannot propagate a wrong figure into every future invoice.
    /// </summary>
    [Fact]
    public async Task Recalculates_rather_than_trusting_the_templates_stored_totals()
    {
        using var harness = new RecurringTestHarness();
        await harness.SeedAsync();
        await harness.CorruptTemplateTotalsAsync(9999m);
        await harness.SeedDueScheduleAsync();

        await harness.RunOnceAsync();

        var generated = Assert.Single(await harness.GeneratedInvoicesAsync());

        Assert.Equal(550m, generated.TotalAmount);
        Assert.NotEqual(9999m, generated.TotalAmount);
    }

    [Fact]
    public async Task Carries_multiple_lines_in_their_original_order()
    {
        using var harness = new RecurringTestHarness();
        await harness.SeedAsync();
        await harness.AddTemplateLineAsync("Support hours", quantity: 4, unit: "Hour", unitPrice: 50, taxRate: 10, sortOrder: 1);
        await harness.SeedDueScheduleAsync();

        await harness.RunOnceAsync();

        var generated = Assert.Single(await harness.GeneratedInvoicesAsync());
        var items = generated.Items.OrderBy(i => i.SortOrder).ToList();

        Assert.Equal(2, items.Count);
        Assert.Equal("Monthly retainer", items[0].Description);
        Assert.Equal("Support hours", items[1].Description);
        Assert.Equal("Hour", items[1].Unit);
        // 4 x 50 = 200 + 10% = 220, on top of the retainer's 550.
        Assert.Equal(220m, items[1].LineTotal);
        Assert.Equal(770m, generated.TotalAmount);
    }

    /// <summary>Each period's invoice is a fresh, complete copy - not progressively degraded.</summary>
    [Fact]
    public async Task A_second_periods_invoice_is_just_as_complete()
    {
        using var harness = new RecurringTestHarness();
        await harness.SeedAsync();
        var scheduleId = await harness.SeedDueScheduleAsync();

        await harness.RunOnceAsync();
        await harness.MakeDueAsync(scheduleId);
        await harness.RunOnceAsync();

        var generated = await harness.GeneratedInvoicesAsync();
        Assert.Equal(2, generated.Count);

        foreach (var invoice in generated)
        {
            var item = Assert.Single(invoice.Items);
            Assert.Equal("Month", item.Unit);
            Assert.Equal(550m, item.LineTotal);
            Assert.Equal(invoice.TotalAmount, invoice.Items.Sum(i => i.LineTotal));
        }

        // And the two are genuinely separate documents.
        Assert.NotEqual(generated[0].Id, generated[1].Id);
        Assert.NotEqual(generated[0].InvoiceNumber, generated[1].InvoiceNumber);
    }
}
