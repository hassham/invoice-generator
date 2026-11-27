import type { Metadata } from "next";
import { WorkspaceHeading } from "../../components/ui/WorkspaceCollection";
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
      <main className="workspace-main max-w-5xl">
        <WorkspaceHeading area="customer" eyebrow="Workspace / New record" title="New customer"
          description="Save billing details once, then reuse them when you invoice." back={{ href: "/customers", label: "Back to customers" }} />
        <CreateCustomerForm />
      </main>
      <SiteFooter workspace />
    </>
  );
}
