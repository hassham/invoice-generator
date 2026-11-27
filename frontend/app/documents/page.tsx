import type { Metadata } from "next";
import { Suspense } from "react";
import { SiteFooter } from "../components/landing/SiteFooter";
import { SiteHeader } from "../components/landing/SiteHeader";
import { DocumentListView } from "./components/DocumentListView";

const title = "Documents";
const description = "Browse every document you have issued or received, filtered by type.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/documents",
  },
};

export default function DocumentsPage() {
  return (
    <>
      <SiteHeader />
      <main data-section="documents" className="workspace-main workspace-polish max-w-6xl">
        {/* DocumentListView reads/writes the URL query string via useSearchParams, which the App
            Router requires a Suspense boundary around on a statically-rendered route - same
            reasoning as the invoice list page. */}
        <Suspense fallback={<p className="text-sm text-muted">Loading documents…</p>}>
          <DocumentListView />
        </Suspense>
      </main>
      <SiteFooter workspace />
    </>
  );
}
