using Microsoft.Extensions.Options;

namespace InvoiceApp.Infrastructure.Configuration;

public sealed class DatabaseOptionsValidator : IValidateOptions<DatabaseOptions>
{
    public ValidateOptionsResult Validate(string? name, DatabaseOptions options)
    {
        if (string.IsNullOrWhiteSpace(options.Default))
        {
            return ValidateOptionsResult.Fail(
                $"{DatabaseOptions.SectionName}:{nameof(DatabaseOptions.Default)} is required and must not be empty. " +
                $"Set it via configuration or the {DatabaseOptions.SectionName}__{nameof(DatabaseOptions.Default)} environment variable.");
        }

        return ValidateOptionsResult.Success;
    }
}
