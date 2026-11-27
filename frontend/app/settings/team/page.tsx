import type { Metadata } from "next";
import { SiteFooter } from "../../components/landing/SiteFooter";
import { SiteHeader } from "../../components/landing/SiteHeader";
import { TeamSettings } from "./components/TeamSettings";

export const metadata: Metadata = {
  title: "Team",
  description: "Invite people to help manage your business.",
};

export default function TeamSettingsPage() {
  return (
    <>
      <SiteHeader />
      <main className="workspace-main max-w-2xl">
        <TeamSettings />
      </main>
      <SiteFooter workspace />
    </>
  );
}
