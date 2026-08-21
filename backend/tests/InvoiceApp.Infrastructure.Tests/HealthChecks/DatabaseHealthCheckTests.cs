using InvoiceApp.Infrastructure.HealthChecks;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace InvoiceApp.Infrastructure.Tests.HealthChecks;

/// <summary>
/// Verifies IG-81's completion criteria directly: health responses must distinguish healthy,
/// degraded and failed dependencies. Exercises the pure decision logic (DatabaseHealthCheck.Evaluate)
/// rather than a real database connection, which InvoiceApp.Infrastructure.Tests does not depend on.
/// </summary>
public class DatabaseHealthCheckTests
{
    [Fact]
    public void Reports_unhealthy_when_the_database_cannot_be_reached()
    {
        var result = DatabaseHealthCheck.Evaluate(canConnect: false, elapsed: TimeSpan.Zero);

        Assert.Equal(HealthStatus.Unhealthy, result.Status);
    }

    [Fact]
    public void Reports_healthy_when_the_database_responds_quickly()
    {
        var result = DatabaseHealthCheck.Evaluate(canConnect: true, elapsed: TimeSpan.FromMilliseconds(50));

        Assert.Equal(HealthStatus.Healthy, result.Status);
    }

    [Fact]
    public void Reports_degraded_when_the_database_responds_slowly()
    {
        var result = DatabaseHealthCheck.Evaluate(canConnect: true, elapsed: TimeSpan.FromSeconds(2));

        Assert.Equal(HealthStatus.Degraded, result.Status);
    }

    [Theory]
    [InlineData(false, 0)]
    [InlineData(true, 50)]
    [InlineData(true, 2000)]
    public void Never_includes_exception_details_in_the_result_description(bool canConnect, int elapsedMilliseconds)
    {
        var result = DatabaseHealthCheck.Evaluate(canConnect, TimeSpan.FromMilliseconds(elapsedMilliseconds));

        Assert.Null(result.Exception);
    }
}
