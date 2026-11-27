import type { Metadata } from "next";
import { PublicDocumentShell } from "../../components/ui/PublicDocumentShell";
import { HostedEstimateView } from "./components/HostedEstimateView";

export const metadata: Metadata = {
  title: "Estimate",
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
    <PublicDocumentShell>
        <HostedEstimateView token={token} />
    </PublicDocumentShell>
  );
}
