import Link from "next/link";
import { AnalyticsCtaLink } from "../analytics/AnalyticsCtaLink";

const freeIncludes = [
  "Unlimited draft invoices",
  "Core invoice templates",
  "PDF download",
  "Saved customers and items",
  "Basic payment tracking",
];

const proIncludes = [
  "Everything in Free",
  "Premium templates",
  "No Invoice App branding",
  "Email invoices directly to customers",
  "Multiple businesses",
];

export function PricingTeaserSection() {
  return (
    <section id="pricing" aria-labelledby="pricing-heading" className="bg-canvas py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="pricing-heading" className="text-3xl font-bold tracking-tight text-ink">
            Simple pricing, generous free plan
          </h2>
          <p className="mt-4 text-lg text-muted">
            Start for free, no credit card required. Upgrade only if you need more.
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-3xl grid-cols-1 gap-8 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-paper p-8">
            <h3 className="text-lg font-semibold text-ink">Free</h3>
            <p className="mt-1 text-sm text-muted">For getting started</p>
            <p className="mt-6 text-3xl font-bold text-ink">$0</p>
            <ul className="mt-6 space-y-3">
              {freeIncludes.map((item) => (
                <li key={item} className="text-sm text-ink">
                  {item}
                </li>
              ))}
            </ul>
            <AnalyticsCtaLink
              href="/invoice/create"
              entryPoint="pricing_free_plan"
              className="mt-8 block w-full rounded-full border-[1.5px] border-ink bg-paper px-6 py-2.5 text-center text-sm font-semibold text-ink hover:bg-canvas transition-colors hover:bg-canvas"
            >
              Create Free Invoice
            </AnalyticsCtaLink>
          </div>

          <div className="rounded-2xl border border-ink bg-paper p-8 ring-1 ring-ink">
            <h3 className="text-lg font-semibold text-ink">Pro</h3>
            <p className="mt-1 text-sm text-muted">For growing businesses</p>
            <p className="mt-6 text-3xl font-bold text-ink">
              From $5<span className="text-base font-medium text-muted">/month</span>
            </p>
            <ul className="mt-6 space-y-3">
              {proIncludes.map((item) => (
                <li key={item} className="text-sm text-ink">
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/signup"
              className="mt-8 block w-full rounded-full border-[1.5px] border-ink bg-accent px-6 py-2.5 text-center text-sm font-semibold text-ink transition-colors hover:bg-[#c4ee1a]"
            >
              Sign up to get started
            </Link>
          </div>
        </div>

        <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-muted">
          Pricing is indicative and may change before general availability.
        </p>
      </div>
    </section>
  );
}
