namespace InvoiceApp.Infrastructure.Configuration;

public sealed class DatabaseOptions
{
    public const string SectionName = "ConnectionStrings";

    public string Default { get; init; } = string.Empty;
}
