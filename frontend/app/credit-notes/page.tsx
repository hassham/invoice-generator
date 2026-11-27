import type { Metadata } from "next";
import { Suspense } from "react";
import { SiteHeader } from "../components/landing/SiteHeader";
import { SiteFooter } from "../components/landing/SiteFooter";
import { CreditNoteContent } from "./components/CreditNoteContent";

export const metadata: Metadata = { title: "Credit notes" };

export default function CreditNotePage() {
  return (
    <>
      <SiteHeader />
      <main className="workspace-main max-w-5xl">
        <Suspense fallback={<p role="status" className="workspace-state">Loading credit notes…</p>}>
          <CreditNoteContent />
        </Suspense>
      </main>
      <SiteFooter workspace />
    </>
  );
}
