import type { Metadata } from "next";
import { SiteFooter } from "../components/landing/SiteFooter";
import { SiteHeader } from "../components/landing/SiteHeader";
import { ItemListView } from "./components/ItemListView";

const title = "Items | Invoice App";
const description = "View and manage your saved products and services.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/items",
  },
};

export default function ItemsPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-6 py-16">
        <ItemListView />
      </main>
      <SiteFooter />
    </>
  );
}
