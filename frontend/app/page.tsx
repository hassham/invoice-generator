import type { Metadata } from "next";
import { PageViewTracker } from "./components/analytics/PageViewTracker";
import { GuestOnlyContent } from "./components/auth/GuestOnlyContent";
import { BenefitsSection } from "./components/landing/BenefitsSection";
import { FaqSection } from "./components/landing/FaqSection";
import { Hero } from "./components/landing/Hero";
import { PricingTeaserSection } from "./components/landing/PricingTeaserSection";
import { SiteFooter } from "./components/landing/SiteFooter";
import { SiteHeader } from "./components/landing/SiteHeader";
import { TemplatePreviewSection } from "./components/landing/TemplatePreviewSection";

const title = "BEVORLY | Invoices, Clients & Payments";
const description =
  "Less paperwork. More business. Create and preview professional invoices for free, and manage clients and payments with BEVORLY.";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: "/" },
  openGraph: { title, description, url: "/", type: "website" },
};

export default function Home() {
  // Signed-in accounts are sent to the dashboard instead of seeing this page.
  return (
    <GuestOnlyContent>
      <PageViewTracker />
      <SiteHeader />
      <main>
        <Hero />
        <BenefitsSection />
        <TemplatePreviewSection />
        <PricingTeaserSection />
        <FaqSection />
      </main>
      <SiteFooter />
    </GuestOnlyContent>
  );
}
