import type { Metadata } from "next";
import { SiteFooter } from "../../components/landing/SiteFooter";
import { SiteHeader } from "../../components/landing/SiteHeader";
import { CombinedReportsView } from "../components/CombinedReportsView";

const title = "All businesses";
const description = "Revenue, outstanding, overdue and tax figures across all your businesses.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/reports/combined",
  },
};

export default function CombinedReportsPage() {
  return (
    <>
      <SiteHeader />
      <main data-section="reporting" className="workspace-main workspace-polish max-w-5xl">
        <CombinedReportsView />
      </main>
      <SiteFooter workspace />
    </>
  );
}
