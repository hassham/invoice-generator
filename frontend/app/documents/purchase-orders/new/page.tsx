import type { Metadata } from "next";
import { SiteFooter } from "../../../components/landing/SiteFooter";
import { SiteHeader } from "../../../components/landing/SiteHeader";
import { CreatePurchaseOrderForm } from "./components/CreatePurchaseOrderForm";

export const metadata: Metadata = {
  title: "New Purchase Order",
  description: "Raise a purchase order for a supplier.",
  alternates: {
    canonical: "/documents/purchase-orders/new",
  },
};

export default function NewPurchaseOrderPage() {
  return (
    <>
      <SiteHeader />
      <main data-section="documents" className="workspace-main workspace-polish max-w-4xl">
        <CreatePurchaseOrderForm />
      </main>
      <SiteFooter workspace />
    </>
  );
}
