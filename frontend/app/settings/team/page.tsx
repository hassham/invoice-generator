import type { Metadata } from "next";
import { SiteFooter } from "../../components/landing/SiteFooter";
import { SiteHeader } from "../../components/landing/SiteHeader";
import { TeamSettings } from "./components/TeamSettings";

export const metadata: Metadata = {
  title: "Team | Invoice App",
  description: "Invite people to help manage your business.",
};

export default function TeamSettingsPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-6 py-16">
        <TeamSettings />
      </main>
      <SiteFooter />
    </>
  );
}
