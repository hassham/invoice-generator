namespace InvoiceApp.Infrastructure.Payments;

/// <summary>
/// Stripe expects amounts in the currency's smallest unit (cents for USD/AUD/EUR...), except for
/// a documented list of "zero-decimal" currencies it takes as a whole number directly - sending
/// JPY 1000 as 100000 would charge 1000x too much. This app has never needed currency-specific
/// handling before (Engineering Note 27's epsilon-rounding fix was about float precision, not
/// this), so this is a fresh, narrow addition scoped to exactly what Stripe's API requires.
/// List per Stripe's own documented zero-decimal currencies.
/// </summary>
public static class StripeAmountConverter
{
    private static readonly HashSet<string> ZeroDecimalCurrencies = new(StringComparer.OrdinalIgnoreCase)
    {
        "BIF", "CLP", "DJF", "GNF", "JPY", "KMF", "KRW", "MGA", "PYG", "RWF", "UGX", "VND", "VUV", "XAF", "XOF", "XPF",
    };

    public static long ToSmallestUnit(decimal amount, string currency) =>
        ZeroDecimalCurrencies.Contains(currency) ? (long)Math.Round(amount, MidpointRounding.AwayFromZero) : (long)Math.Round(amount * 100m, MidpointRounding.AwayFromZero);

    public static decimal FromSmallestUnit(long amount, string currency) =>
        ZeroDecimalCurrencies.Contains(currency) ? amount : amount / 100m;
}
