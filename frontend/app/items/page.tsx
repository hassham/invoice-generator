import type { Metadata } from "next";
import { SiteFooter } from "../components/landing/SiteFooter";
import { SiteHeader } from "../components/landing/SiteHeader";
import { ItemListView } from "./components/ItemListView";

const title = "Items";
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
      <main className="workspace-main max-w-6xl">
        <ItemListView />
      </main>
      <SiteFooter workspace />
    </>
  );
}
