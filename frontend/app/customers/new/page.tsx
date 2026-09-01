import type { Metadata } from "next";
import { SiteFooter } from "../../components/landing/SiteFooter";
import { SiteHeader } from "../../components/landing/SiteHeader";
import { CreateCustomerForm } from "./components/CreateCustomerForm";

const title = "New Customer | Invoice App";
const description = "Create a new customer record.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/customers/new",
  },
};

export default function NewCustomerPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="text-2xl font-bold text-slate-950">New customer</h1>
        <div className="mt-6">
          <CreateCustomerForm />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
