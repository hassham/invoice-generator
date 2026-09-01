import type { Metadata } from "next";
import { SiteFooter } from "../components/landing/SiteFooter";
import { SiteHeader } from "../components/landing/SiteHeader";
import { CustomerListView } from "./components/CustomerListView";

const title = "Customers | Invoice App";
const description = "View and manage your saved customers.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/customers",
  },
};

export default function CustomersPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-6 py-16">
        <CustomerListView />
      </main>
      <SiteFooter />
    </>
  );
}
