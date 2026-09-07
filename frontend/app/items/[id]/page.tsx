import type { Metadata } from "next";
import { SiteFooter } from "../../components/landing/SiteFooter";
import { SiteHeader } from "../../components/landing/SiteHeader";
import { ItemDetail } from "./components/ItemDetail";

export const metadata: Metadata = {
  title: "Item | Invoice App",
  description: "View and edit a product or service record.",
};

export default async function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-6 py-16">
        <ItemDetail itemId={id} />
      </main>
      <SiteFooter />
    </>
  );
}
