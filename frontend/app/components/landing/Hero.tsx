import Link from "next/link";
import { AnalyticsCtaLink } from "../analytics/AnalyticsCtaLink";
import { SampleInvoice } from "./SampleInvoice";

export function Hero() {
  return (
    <section aria-labelledby="homepage-title" className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 pt-12 sm:px-8 sm:pb-24 sm:pt-16 lg:grid-cols-[1fr_1fr] lg:gap-14">
      <div>
        <p className="flex items-center gap-2 font-mono text-[0.69rem] font-bold uppercase tracking-[0.12em] text-ink sm:text-xs">
          <span aria-hidden="true" className="size-2.5 rounded-full border border-ink bg-accent" />
          Meet your business sidekick
        </p>
        <h1 id="homepage-title" className="mt-5 font-display text-[clamp(2.35rem,5.55vw,4.75rem)] font-bold leading-[0.99] tracking-[-0.05em] text-ink">
          <span className="block">Less paperwork.</span>{" "}
          <span className="relative inline-block">
            More business.
            <svg aria-hidden="true" viewBox="0 0 390 16" preserveAspectRatio="none" className="pointer-events-none absolute -bottom-2 left-0 h-3 w-full text-accent sm:-bottom-3 sm:h-4">
              <path d="M4 11C103 2 256 1 386 8M24 13C136 7 292 7 372 12" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
            </svg>
          </span>
        </h1>
        <p className="mt-8 max-w-md text-lg leading-relaxed text-ink sm:text-xl">
          Invoices, clients and payments. Beautifully organised in one place.
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-4">
          <AnalyticsCtaLink href="/invoice/create" entryPoint="hero" className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full border-2 border-ink bg-accent px-5 py-2.5 font-semibold text-ink shadow-[3px_3px_0_var(--color-ink)] transition-colors hover:bg-yellow focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink">
            Create Free Invoice <span aria-hidden="true">&rarr;</span>
          </AnalyticsCtaLink>
          <Link href="#sample-invoice" className="inline-flex min-h-11 items-center font-semibold text-ink underline decoration-1 underline-offset-4 hover:decoration-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink">
            See a sample invoice
          </Link>
        </div>
        <p className="mt-5 max-w-sm text-sm leading-relaxed text-muted">
          No account to create or preview. Sign in to download or print.
        </p>
      </div>

      <figure id="sample-invoice" aria-labelledby="sample-invoice-caption" className="relative isolate min-w-0 scroll-mt-24 overflow-hidden rounded-[2rem] border-2 border-ink bg-lavender px-4 pb-6 pt-4 shadow-[5px_5px_0_var(--color-ink)] sm:px-7 sm:pb-7 sm:pt-5">
        <figcaption id="sample-invoice-caption" className="relative z-10 flex items-center gap-2 font-mono text-[0.65rem] font-bold uppercase tracking-[0.13em] text-ink">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-ink" /> Sample invoice
        </figcaption>
        <svg aria-hidden="true" viewBox="0 0 70 68" className="pointer-events-none absolute right-3 top-2 h-14 w-14 text-ink sm:right-5 sm:top-3">
          <path d="M48 3v25M36 15h24M14 25v15M7 32h14M62 39v16M54 47h16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
        <div className="relative mx-auto mt-5 max-w-md overflow-hidden rounded-xl border-2 border-ink bg-paper shadow-[4px_4px_0_var(--color-ink)] sm:mt-6 sm:-rotate-1">
          <SampleInvoice />
        </div>
        <span className="relative ml-auto mt-4 flex w-fit items-center gap-2 rounded-full border-2 border-ink bg-status-paid-bg px-3 py-1.5 text-sm font-bold text-status-paid-fg sm:absolute sm:bottom-5 sm:right-4 sm:mt-0 sm:rotate-2">
          <span aria-hidden="true">&#10003;</span> Paid
        </span>
      </figure>
    </section>
  );
}
