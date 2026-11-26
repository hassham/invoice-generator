import type { Metadata } from "next";
import { Suspense } from "react";
import { SiteFooter } from "../../components/landing/SiteFooter";
import { SiteHeader } from "../../components/landing/SiteHeader";
import { BusinessProfileSettings } from "./components/BusinessProfileSettings";

export const metadata: Metadata = {
  title: "Business Profile",
  description: "Configure your business profile and invoice defaults.",
};

export default function BusinessProfilePage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-5 py-9 sm:px-8 sm:py-12">
        {/* IG-219: BusinessProfileSettings reads ?stripeConnected=/?stripeConnectError= via
            useSearchParams (next/navigation) - the App Router requires a Suspense boundary around
            any such client component on a statically-rendered route, or `next build` fails with a
            "missing suspense boundary" error. Same convention as the Invoices list/invoice
            editor pages. */}
        <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
          <BusinessProfileSettings />
        </Suspense>
      </main>
      <SiteFooter workspace />
    </>
  );
}
