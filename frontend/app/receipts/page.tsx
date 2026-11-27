import type { Metadata } from "next";
import { Suspense } from "react";
import { SiteHeader } from "../components/landing/SiteHeader";
import { SiteFooter } from "../components/landing/SiteFooter";
import { ReceiptContent } from "./components/ReceiptContent";

export const metadata: Metadata = { title: "Receipts" };

export default function ReceiptPage() {
  return (
    <>
      <SiteHeader />
      <main className="workspace-main max-w-5xl">
        <Suspense fallback={<p role="status" className="workspace-state">Loading receipts…</p>}>
          <ReceiptContent />
        </Suspense>
      </main>
      <SiteFooter workspace />
    </>
  );
}
