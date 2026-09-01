import type { Metadata } from "next";
import { SiteFooter } from "../../components/landing/SiteFooter";
import { SiteHeader } from "../../components/landing/SiteHeader";
import { BusinessProfileSettings } from "./components/BusinessProfileSettings";

export const metadata: Metadata = {
  title: "Business Profile | Invoice App",
  description: "Configure your business profile and invoice defaults.",
};

export default function BusinessProfilePage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-6 py-16">
        <BusinessProfileSettings />
      </main>
      <SiteFooter />
    </>
  );
}
