import { BenefitsSection } from "./components/landing/BenefitsSection";
import { FaqSection } from "./components/landing/FaqSection";
import { FeatureOverviewSection } from "./components/landing/FeatureOverviewSection";
import { Hero } from "./components/landing/Hero";
import { HowItWorksSection } from "./components/landing/HowItWorksSection";
import { PricingTeaserSection } from "./components/landing/PricingTeaserSection";
import { SiteFooter } from "./components/landing/SiteFooter";
import { SiteHeader } from "./components/landing/SiteHeader";
import { TemplatePreviewSection } from "./components/landing/TemplatePreviewSection";

export default function Home() {
  return (
    <>
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
