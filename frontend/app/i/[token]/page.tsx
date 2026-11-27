import type { Metadata } from "next";
import { PublicDocumentShell } from "../../components/ui/PublicDocumentShell";
import { Suspense } from "react";
import styles from "../../components/ui/PublicDocument.module.css";
import { HostedInvoiceView } from "./components/HostedInvoiceView";

export const metadata: Metadata = {
  title: "Invoice",
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
    <PublicDocumentShell>
        {/* IG-216: HostedInvoiceView reads ?session_id=/?checkout= via useSearchParams
            (next/navigation) - same "missing suspense boundary" requirement as
            BusinessProfileSettings.tsx's own Stripe redirect-back handling. */}
        <Suspense fallback={<p role="status" className={styles.notice}>Loading invoice…</p>}>
          <HostedInvoiceView token={token} />
        </Suspense>
    </PublicDocumentShell>
  );
}
