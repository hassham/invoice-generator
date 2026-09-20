import type { Metadata } from "next";
import Link from "next/link";
import { HostedEstimateView } from "./components/HostedEstimateView";

export const metadata: Metadata = {
  title: "Estimate | Invoice App",
  description: "View your estimate and download a PDF copy.",
  // IG-221: same reasoning as the hosted invoice page (IG-215) - a bearer-capability URL should
  // never be indexed.
  robots: { index: false, follow: false },
};

/**
 * IG-221: mirrors the hosted invoice page's own no-SiteHeader/SiteFooter reasoning - reached by a
 * customer with no account and no relationship to this app.
 */
export default async function HostedEstimatePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  return (
    <>
      <header className="border-b border-slate-200 px-6 py-4">
        <Link href="/" className="text-lg font-bold tracking-tight text-slate-950">
          Invoice App
        </Link>
      </header>
      <main className="mx-auto max-w-2xl px-6 py-16">
        <HostedEstimateView token={token} />
      </main>
    </>
  );
}
