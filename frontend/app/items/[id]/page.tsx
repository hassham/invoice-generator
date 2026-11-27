import type { Metadata } from "next";
import { SiteFooter } from "../../components/landing/SiteFooter";
import { SiteHeader } from "../../components/landing/SiteHeader";
import { ItemDetail } from "./components/ItemDetail";

export const metadata: Metadata = {
  title: "Item",
  description: "View and edit a product or service record.",
};

export default async function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <>
      <SiteHeader />
      <main className="workspace-main max-w-2xl">
        <ItemDetail itemId={id} />
      </main>
      <SiteFooter workspace />
    </>
  );
}
