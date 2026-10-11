import type { Metadata } from "next";
import { SiteFooter } from "../components/landing/SiteFooter";
import { SiteHeader } from "../components/landing/SiteHeader";
import { BusinessesPage } from "./components/BusinessesPage";

export const metadata: Metadata = {
  title: "Your Businesses | Invoice App",
  description: "Manage the businesses on your account and choose which one you are working on.",
};

export default function BusinessesRoute() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-6 py-16">
        <BusinessesPage />
      </main>
      <SiteFooter />
    </>
  );
}
