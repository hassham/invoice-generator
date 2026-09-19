import type { Metadata } from "next";
import { SiteFooter } from "../../components/landing/SiteFooter";
import { SiteHeader } from "../../components/landing/SiteHeader";
import { CreateEstimateEditor } from "./components/CreateEstimateEditor";

export const metadata: Metadata = {
  title: "Create Estimate | Invoice App",
  description: "Create an estimate to send a quote before committing to an invoice.",
};

/**
 * IG-220: authenticated-only (unlike /invoice/create), so this includes the normal SiteHeader/
 * SiteFooter chrome, same convention as /items/new and /customers/new - unlike the anonymous
 * invoice-creation flow, there's no reason to hide navigation here.
 */
export default function CreateEstimatePage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="sr-only">Create an estimate</h1>
        <CreateEstimateEditor />
      </main>
      <SiteFooter />
    </>
  );
}
