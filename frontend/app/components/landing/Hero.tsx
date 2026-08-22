import Link from "next/link";
import { AnalyticsCtaLink } from "../analytics/AnalyticsCtaLink";

export function Hero() {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-20 pt-16 text-center sm:pt-24">
      <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
        Free invoice generator
      </p>
      <h1 className="mx-auto mt-4 max-w-3xl text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
        Create it. Send it. Get paid.
      </h1>
      <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
        Build a professional invoice in under two minutes. No sign-up required to get started, no
        accounting knowledge needed, and it works just as well on your phone as your laptop.
      </p>
      <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
        <AnalyticsCtaLink
          href="/invoice/create"
          entryPoint="hero"
          className="w-full rounded-full bg-blue-600 px-8 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 sm:w-auto"
        >
          Create Free Invoice
        </AnalyticsCtaLink>
        <Link
          href="#templates"
          className="w-full rounded-full border border-slate-300 px-8 py-3 text-base font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:text-slate-950 sm:w-auto"
        >
          Browse templates
        </Link>
      </div>
      <p className="mt-4 text-sm text-slate-500">No credit card. No account needed to try it.</p>
    </section>
  );
}
