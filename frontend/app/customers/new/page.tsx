import type { Metadata } from "next";
import { SiteFooter } from "../../components/landing/SiteFooter";
import { SiteHeader } from "../../components/landing/SiteHeader";
import { CreateCustomerForm } from "./components/CreateCustomerForm";

const title = "New Customer";
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
      <main className="workspace-main max-w-2xl">
        <h1 className="workspace-heading">New customer</h1>
        <p className="mt-2 text-sm text-muted">Save this customer so you can reuse the details in future invoices.</p>
        <div className="workspace-panel mt-6 p-4 sm:p-6">
          <CreateCustomerForm />
        </div>
      </main>
      <SiteFooter workspace />
    </>
  );
}
