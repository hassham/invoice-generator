import type { Metadata } from "next";
import Link from "next/link";
import { HostedInvoiceView } from "./components/HostedInvoiceView";

export const metadata: Metadata = {
  title: "Invoice | Invoice App",
  description: "View your invoice and download a PDF copy.",
  // IG-215: a hosted invoice URL is a bearer capability - a search engine indexing it would make
  // an "unguessable" token discoverable via search results instead.
  robots: { index: false, follow: false },
};

/**
 * IG-214: deliberately no SiteHeader/SiteFooter - this page is reached by a customer with no
 * account and no relationship to the app itself, so the full marketing/auth nav (Login, Sign Up,
 * Templates, Pricing...) would be irrelevant chrome, not a helpful signpost. Just enough branding
 * to look intentional, nothing that invites navigating away from the one thing this page is for.
 */
export default async function HostedInvoicePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  return (
    <>
      <header className="border-b border-slate-200 px-6 py-4">
        <Link href="/" className="text-lg font-bold tracking-tight text-slate-950">
          Invoice App
        </Link>
      </header>
      <main className="mx-auto max-w-2xl px-6 py-16">
        <HostedInvoiceView token={token} />
      </main>
    </>
  );
}
