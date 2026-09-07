import type { Metadata } from "next";
import { SiteFooter } from "../../components/landing/SiteFooter";
import { SiteHeader } from "../../components/landing/SiteHeader";
import { CreateItemForm } from "./components/CreateItemForm";

const title = "New Item | Invoice App";
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
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="text-2xl font-bold text-slate-950">New item</h1>
        <div className="mt-6">
          <CreateItemForm />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
