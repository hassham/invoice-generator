namespace InvoiceApp.Domain.Documents;

public sealed class Template
{
    public Guid Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string TemplateCode { get; set; } = string.Empty;

    public string? PreviewImage { get; set; }

    public bool IsPremium { get; set; }

    public bool IsActive { get; set; } = true;

    public int SortOrder { get; set; }
}
