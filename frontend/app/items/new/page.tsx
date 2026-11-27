import type { Metadata } from "next";
import { WorkspaceHeading } from "../../components/ui/WorkspaceCollection";
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
      <main className="workspace-main max-w-5xl">
        <WorkspaceHeading area="item" eyebrow="Workspace / New record" title="New item"
          description="Set up a reusable product or service with its unit, price and tax." back={{ href: "/items", label: "Back to items" }} />
        <CreateItemForm />
      </main>
      <SiteFooter workspace />
    </>
  );
}
