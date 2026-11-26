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
  "Remove BEVORLY branding",
  "Email invoices directly to customers",
  "Multiple businesses",
];

export function PricingTeaserSection() {
  return (
    <section id="pricing" aria-labelledby="pricing-heading" className="scroll-mt-20 border-y border-ink/15 bg-paper py-14 sm:py-20">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="pricing-heading" className="font-display text-[clamp(2.25rem,5vw,3.5rem)] font-bold leading-[1.03] tracking-[-0.05em] text-ink">
            Start with the essentials.
          </h2>
          <p className="mt-4 text-lg text-muted">
            Create your first invoice for free. No credit card required.
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-3xl grid-cols-1 gap-8 sm:grid-cols-2">
          <div className="rounded-3xl border-2 border-ink bg-canvas p-6 shadow-[3px_3px_0_var(--color-ink)] sm:p-8">
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
              className="mt-8 block w-full rounded-full border-[1.5px] border-ink bg-accent px-6 py-2.5 text-center text-sm font-semibold text-ink transition-colors hover:bg-canvas"
            >
              Create Free Invoice
            </AnalyticsCtaLink>
          </div>

          <div className="rounded-3xl border-2 border-ink bg-lavender p-6 shadow-[3px_3px_0_var(--color-ink)] sm:p-8">
            <h3 className="text-lg font-semibold text-ink">Pro</h3>
            <p className="mt-1 text-sm text-muted">For growing businesses</p>
            <p className="mt-6 text-3xl font-bold text-ink">
              Coming later
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
              className="mt-8 block w-full rounded-full border-[1.5px] border-ink bg-paper px-6 py-2.5 text-center text-sm font-semibold text-ink transition-colors hover:bg-canvas"
            >
              Sign up to get started
            </Link>
          </div>
        </div>

        <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-muted">
          The Pro plan is a preview. Pricing and features will be confirmed before launch.
        </p>
      </div>
    </section>
  );
}
