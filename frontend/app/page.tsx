import type { Metadata } from "next";
import { PageViewTracker } from "./components/analytics/PageViewTracker";
import { BenefitsSection } from "./components/landing/BenefitsSection";
import { FaqSection } from "./components/landing/FaqSection";
import { FeatureOverviewSection } from "./components/landing/FeatureOverviewSection";
import { Hero } from "./components/landing/Hero";
import { HowItWorksSection } from "./components/landing/HowItWorksSection";
import { PricingTeaserSection } from "./components/landing/PricingTeaserSection";
import { SiteFooter } from "./components/landing/SiteFooter";
import { SiteHeader } from "./components/landing/SiteHeader";
import { TemplatePreviewSection } from "./components/landing/TemplatePreviewSection";

const title = "Free Invoice Generator — Create, Send, Get Paid";
const description =
  "Build a professional invoice in under two minutes. No sign-up required to get started, no accounting knowledge needed.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title,
    description,
    url: "/",
    type: "website",
  },
};

export default function Home() {
  return (
    <>
      <PageViewTracker />
      <SiteHeader />
      <main>
        <Hero />
        <BenefitsSection />
        <TemplatePreviewSection />
        <HowItWorksSection />
        <FeatureOverviewSection />
        <PricingTeaserSection />
        <FaqSection />
      </main>
      <SiteFooter />
    </>
  );
}
