import type { Metadata } from "next";
import { SiteFooter } from "../components/landing/SiteFooter";
import { SiteHeader } from "../components/landing/SiteHeader";
import { BusinessesPage } from "./components/BusinessesPage";

export const metadata: Metadata = {
  title: "Your Businesses",
  description: "Manage the businesses on your account and choose which one you are working on.",
};

export default function BusinessesRoute() {
  return (
    <>
      <SiteHeader />
      <main data-section="operations" className="workspace-main workspace-polish max-w-2xl">
        <BusinessesPage />
      </main>
      <SiteFooter workspace />
    </>
  );
}
