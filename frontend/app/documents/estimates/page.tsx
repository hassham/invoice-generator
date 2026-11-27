import type { Metadata } from "next";
import { SiteFooter } from "../../components/landing/SiteFooter";
import { SiteHeader } from "../../components/landing/SiteHeader";
import { EstimateListView } from "./components/EstimateListView";

export const metadata: Metadata = {
  title: "Estimates",
  description: "Browse your saved estimates.",
  alternates: {
    canonical: "/documents/estimates",
  },
};

export default function EstimatesPage() {
  return (
    <>
      <SiteHeader />
      <main className="workspace-main max-w-5xl">
        <EstimateListView />
      </main>
      <SiteFooter workspace />
    </>
  );
}
