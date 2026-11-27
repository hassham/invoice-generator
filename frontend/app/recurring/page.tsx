import type { Metadata } from "next";
import { Suspense } from "react";
import { SiteHeader } from "../components/landing/SiteHeader";
import { SiteFooter } from "../components/landing/SiteFooter";
import { RecurringScheduleContent } from "./components/RecurringScheduleContent";

export const metadata: Metadata = { title: "Recurring schedules" };

export default function RecurringSchedulePage() {
  return (
    <>
      <SiteHeader />
      <main className="workspace-main max-w-5xl">
        <Suspense fallback={<p role="status" className="workspace-state">Loading recurring schedules…</p>}>
          <RecurringScheduleContent />
        </Suspense>
      </main>
      <SiteFooter workspace />
    </>
  );
}
