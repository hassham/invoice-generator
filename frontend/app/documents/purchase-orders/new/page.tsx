import type { Metadata } from "next";
import { SiteFooter } from "../../../components/landing/SiteFooter";
import { SiteHeader } from "../../../components/landing/SiteHeader";
import { CreatePurchaseOrderForm } from "./components/CreatePurchaseOrderForm";

export const metadata: Metadata = {
  title: "New Purchase Order | Invoice App",
  description: "Raise a purchase order for a supplier.",
  alternates: {
    canonical: "/documents/purchase-orders/new",
  },
};

export default function NewPurchaseOrderPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-6 py-16">
        <CreatePurchaseOrderForm />
      </main>
      <SiteFooter />
    </>
  );
}
