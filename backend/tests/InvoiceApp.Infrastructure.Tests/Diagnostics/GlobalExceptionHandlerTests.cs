using InvoiceApp.Api.Diagnostics;
using InvoiceApp.Application.Exceptions;

namespace InvoiceApp.Infrastructure.Tests.Diagnostics;

/// <summary>
/// Verifies IG-82's completion criteria directly: errors are mapped to the correct HTTP status
/// per docs/SAD.md section 81, and sensitive/internal detail is excluded - only the client-safe
/// message of a known, typed Application exception is ever surfaced; anything unexpected gets a
/// generic message with no detail at all.
/// </summary>
public class GlobalExceptionHandlerTests
{
    [Fact]
    public void Maps_validation_exception_to_400_with_its_message()
    {
        var (statusCode, _, detail) = GlobalExceptionHandler.Map(new ValidationException("Email is required."));

        Assert.Equal(400, statusCode);
        Assert.Equal("Email is required.", detail);
    }

    [Fact]
    public void Maps_not_found_exception_to_404_with_its_message()
    {
        var (statusCode, _, detail) = GlobalExceptionHandler.Map(new NotFoundException("Invoice not found."));

        Assert.Equal(404, statusCode);
        Assert.Equal("Invoice not found.", detail);
    }

    [Fact]
    public void Maps_conflict_exception_to_409_with_its_message()
    {
        var (statusCode, _, detail) = GlobalExceptionHandler.Map(new ConflictException("Invoice number already in use."));

        Assert.Equal(409, statusCode);
        Assert.Equal("Invoice number already in use.", detail);
    }

    [Fact]
    public void Maps_an_unexpected_exception_to_500_without_disclosing_its_message()
    {
        var (statusCode, title, detail) = GlobalExceptionHandler.Map(
            new InvalidOperationException("Host=db.internal;Password=supersecret"));

        Assert.Equal(500, statusCode);
        Assert.Equal("An unexpected error occurred.", title);
        Assert.Null(detail);
    }
}
