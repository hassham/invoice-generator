import type { Metadata } from "next";
import { SiteFooter } from "../../../components/landing/SiteFooter";
import { SiteHeader } from "../../../components/landing/SiteHeader";
import { PurchaseOrderDetail } from "./components/PurchaseOrderDetail";

export const metadata: Metadata = {
  title: "Purchase Order | Invoice App",
  description: "View a purchase order placed with a supplier.",
};

export default async function PurchaseOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-6 py-16">
        <PurchaseOrderDetail purchaseOrderId={id} />
      </main>
      <SiteFooter />
    </>
  );
}
