import type { Metadata } from "next";
import { SiteFooter } from "../components/landing/SiteFooter";
import { SiteHeader } from "../components/landing/SiteHeader";
import { TemplatesGallery } from "./components/TemplatesGallery";

const title = "Templates | Invoice App";
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
      <main className="mx-auto max-w-6xl px-6 py-16">
        <h1 className="text-2xl font-bold text-slate-950">Templates</h1>
        <p className="mt-2 text-sm text-slate-600">Preview a template, then use it to start a new invoice.</p>
        <TemplatesGallery />
      </main>
      <SiteFooter />
    </>
  );
}
