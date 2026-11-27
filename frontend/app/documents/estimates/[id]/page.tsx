import type { Metadata } from "next";
import { SiteFooter } from "../../../components/landing/SiteFooter";
import { SiteHeader } from "../../../components/landing/SiteHeader";
import { EstimateDetail } from "./components/EstimateDetail";

export const metadata: Metadata = {
  title: "Estimate",
  description: "View and edit a saved estimate.",
};

export default async function EstimateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <>
      <SiteHeader />
      <main className="workspace-main max-w-4xl">
        <EstimateDetail estimateId={id} />
      </main>
      <SiteFooter workspace />
    </>
  );
}
