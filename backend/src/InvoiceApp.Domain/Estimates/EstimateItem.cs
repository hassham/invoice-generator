namespace InvoiceApp.Domain.Estimates;

public sealed class EstimateItem
{
    public Guid Id { get; set; }

    public Guid EstimateId { get; set; }

    public string Description { get; set; } = string.Empty;

    public decimal Quantity { get; set; } = 1;

    public string? Unit { get; set; }

    public decimal UnitPrice { get; set; }

    public decimal TaxRate { get; set; }

    public decimal Discount { get; set; }

    public decimal LineSubtotal { get; set; }

    public decimal TaxAmount { get; set; }

    public decimal LineTotal { get; set; }

    public int SortOrder { get; set; }
}
