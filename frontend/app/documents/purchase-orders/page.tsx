import type { Metadata } from "next";
import { SiteFooter } from "../../components/landing/SiteFooter";
import { SiteHeader } from "../../components/landing/SiteHeader";
import { PurchaseOrderListView } from "./components/PurchaseOrderListView";

export const metadata: Metadata = {
  title: "Purchase Orders",
  description: "Browse the purchase orders you have placed with your suppliers.",
  alternates: {
    canonical: "/documents/purchase-orders",
  },
};

export default function PurchaseOrdersPage() {
  return (
    <>
      <SiteHeader />
      <main data-section="documents" className="workspace-main workspace-polish max-w-5xl">
        <PurchaseOrderListView />
      </main>
      <SiteFooter workspace />
    </>
  );
}
