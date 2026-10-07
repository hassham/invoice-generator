import type { Metadata } from "next";
import { SiteFooter } from "../../components/landing/SiteFooter";
import { SiteHeader } from "../../components/landing/SiteHeader";
import { PurchaseOrderListView } from "./components/PurchaseOrderListView";

export const metadata: Metadata = {
  title: "Purchase Orders | Invoice App",
  description: "Browse the purchase orders you have placed with your suppliers.",
  alternates: {
    canonical: "/documents/purchase-orders",
  },
};

export default function PurchaseOrdersPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-6 py-16">
        <PurchaseOrderListView />
      </main>
      <SiteFooter />
    </>
  );
}
