import type { Metadata } from "next";
import { SiteFooter } from "../components/landing/SiteFooter";
import { SiteHeader } from "../components/landing/SiteHeader";
import { OnboardingWizard } from "./components/OnboardingWizard";

export const metadata: Metadata = {
  title: "Set Up Your Business",
  description: "Guided setup for your business profile - skippable at any step.",
};

export default function OnboardingPage() {
  return (
    <>
      <SiteHeader />
      <main data-section="operations" className="workspace-polish">
        <OnboardingWizard />
      </main>
      <SiteFooter workspace />
    </>
  );
}
