import type { Metadata } from "next";
import { Suspense } from "react";
import { SiteHeader } from "../components/landing/SiteHeader";
import { SiteFooter } from "../components/landing/SiteFooter";
import { ReminderContent } from "./components/ReminderContent";

export const metadata: Metadata = { title: "Payment reminders" };

export default function ReminderPage() {
  return (
    <>
      <SiteHeader />
      <main className="workspace-main max-w-5xl">
        <Suspense fallback={<p role="status" className="workspace-state">Loading reminders…</p>}>
          <ReminderContent />
        </Suspense>
      </main>
      <SiteFooter workspace />
    </>
  );
}
