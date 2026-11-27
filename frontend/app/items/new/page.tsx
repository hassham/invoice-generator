import type { Metadata } from "next";
import { SiteFooter } from "../../components/landing/SiteFooter";
import { SiteHeader } from "../../components/landing/SiteHeader";
import { CreateItemForm } from "./components/CreateItemForm";

const title = "New Item";
const description = "Create a new product or service record.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/items/new",
  },
};

export default function NewItemPage() {
  return (
    <>
      <SiteHeader />
      <main className="workspace-main max-w-2xl">
        <h1 className="workspace-heading">New item</h1>
        <p className="mt-2 text-sm text-muted">Save this item so you can reuse the details in future invoices.</p>
        <div className="workspace-panel mt-6 p-4 sm:p-6">
          <CreateItemForm />
        </div>
      </main>
      <SiteFooter workspace />
    </>
  );
}
