import type { Metadata } from "next";
import { SiteFooter } from "../components/landing/SiteFooter";
import { SiteHeader } from "../components/landing/SiteHeader";
import { TemplatesGallery } from "./components/TemplatesGallery";

const title = "Templates";
const description = "Browse invoice templates, preview them, and start a new invoice from one.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/templates",
  },
};

export default function TemplatesPage() {
  return (
    <>
      <SiteHeader />
      <main className="workspace-main max-w-6xl">
        <h1 className="workspace-heading">Templates</h1>
        <p className="mt-2 text-sm text-muted">Preview a template, then use it to start a new invoice.</p>
        <TemplatesGallery />
      </main>
      <SiteFooter workspace />
    </>
  );
}
