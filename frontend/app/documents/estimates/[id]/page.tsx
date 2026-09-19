import type { Metadata } from "next";
import { SiteFooter } from "../../../components/landing/SiteFooter";
import { SiteHeader } from "../../../components/landing/SiteHeader";
import { EstimateDetail } from "./components/EstimateDetail";

export const metadata: Metadata = {
  title: "Estimate | Invoice App",
  description: "View and edit a saved estimate.",
};

export default async function EstimateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-6 py-16">
        <EstimateDetail estimateId={id} />
      </main>
      <SiteFooter />
    </>
  );
}
