import type { Metadata } from "next";
import { SiteFooter } from "../../../components/landing/SiteFooter";
import { SiteHeader } from "../../../components/landing/SiteHeader";
import { PurchaseOrderDetail } from "./components/PurchaseOrderDetail";

export const metadata: Metadata = {
  title: "Purchase Order",
  description: "View a purchase order placed with a supplier.",
};

export default async function PurchaseOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <>
      <SiteHeader />
      <main data-section="documents" className="workspace-main workspace-polish max-w-4xl">
        <PurchaseOrderDetail purchaseOrderId={id} />
      </main>
      <SiteFooter workspace />
    </>
  );
}
