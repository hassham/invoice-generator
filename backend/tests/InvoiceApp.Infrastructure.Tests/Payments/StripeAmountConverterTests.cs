using InvoiceApp.Infrastructure.Payments;

namespace InvoiceApp.Infrastructure.Tests.Payments;

/// <summary>IG-216: Stripe expects amounts in the currency's smallest unit, except for a
/// documented list of zero-decimal currencies - getting this wrong would charge 100x too much (or
/// too little) for those currencies specifically.</summary>
public class StripeAmountConverterTests
{
    [Theory]
    [InlineData(10.50, "AUD", 1050)]
    [InlineData(10.55, "USD", 1055)]
    [InlineData(0.01, "GBP", 1)]
    [InlineData(1000, "JPY", 1000)]
    [InlineData(1000, "KRW", 1000)]
    public void ToSmallestUnit_converts_correctly_per_currency(decimal amount, string currency, long expected)
    {
        Assert.Equal(expected, StripeAmountConverter.ToSmallestUnit(amount, currency));
    }

    [Theory]
    [InlineData(1050, "AUD", 10.50)]
    [InlineData(1, "GBP", 0.01)]
    [InlineData(1000, "JPY", 1000)]
    public void FromSmallestUnit_converts_correctly_per_currency(long amount, string currency, decimal expected)
    {
        Assert.Equal(expected, StripeAmountConverter.FromSmallestUnit(amount, currency));
    }

    [Fact]
    public void Zero_decimal_currency_check_is_case_insensitive()
    {
        Assert.Equal(1000, StripeAmountConverter.ToSmallestUnit(1000, "jpy"));
    }
}
