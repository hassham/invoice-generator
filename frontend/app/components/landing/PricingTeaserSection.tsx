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
    <section id="pricing" aria-labelledby="pricing-heading" className="bg-slate-50 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="pricing-heading" className="text-3xl font-bold tracking-tight text-slate-950">
            Simple pricing, generous free plan
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Start for free, no credit card required. Upgrade only if you need more.
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-3xl grid-cols-1 gap-8 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-8">
            <h3 className="text-lg font-semibold text-slate-950">Free</h3>
            <p className="mt-1 text-sm text-slate-600">For getting started</p>
            <p className="mt-6 text-3xl font-bold text-slate-950">$0</p>
            <ul className="mt-6 space-y-3">
              {freeIncludes.map((item) => (
                <li key={item} className="text-sm text-slate-700">
                  {item}
                </li>
              ))}
            </ul>
            <AnalyticsCtaLink
              href="/invoice/create"
              entryPoint="pricing_free_plan"
              className="mt-8 block w-full rounded-full bg-slate-950 px-6 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-slate-800"
            >
              Create Free Invoice
            </AnalyticsCtaLink>
          </div>

          <div className="rounded-2xl border border-blue-600 bg-white p-8 ring-1 ring-blue-600">
            <h3 className="text-lg font-semibold text-slate-950">Pro</h3>
            <p className="mt-1 text-sm text-slate-600">For growing businesses</p>
            <p className="mt-6 text-3xl font-bold text-slate-950">
              From $5<span className="text-base font-medium text-slate-500">/month</span>
            </p>
            <ul className="mt-6 space-y-3">
              {proIncludes.map((item) => (
                <li key={item} className="text-sm text-slate-700">
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/signup"
              className="mt-8 block w-full rounded-full bg-blue-600 px-6 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              Sign up to get started
            </Link>
          </div>
        </div>

        <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-slate-500">
          Pricing is indicative and may change before general availability.
        </p>
      </div>
    </section>
  );
}
