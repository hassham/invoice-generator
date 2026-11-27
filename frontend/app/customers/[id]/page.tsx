import type { Metadata } from "next";
import { SiteFooter } from "../../components/landing/SiteFooter";
import { SiteHeader } from "../../components/landing/SiteHeader";
import { CustomerDetail } from "./components/CustomerDetail";

export const metadata: Metadata = {
  title: "Customer",
  description: "View and edit a customer record.",
};

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <>
      <SiteHeader />
      <main className="workspace-main max-w-2xl">
        <CustomerDetail customerId={id} />
      </main>
      <SiteFooter workspace />
    </>
  );
}
