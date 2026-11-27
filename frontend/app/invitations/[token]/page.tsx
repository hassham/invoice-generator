import type { Metadata } from "next";
import { SiteFooter } from "../../components/landing/SiteFooter";
import { SiteHeader } from "../../components/landing/SiteHeader";
import { InvitationAccept } from "./components/InvitationAccept";

export const metadata: Metadata = {
  title: "Team invitation",
  description: "Accept an invitation to help manage a business.",
};

export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  return (
    <>
      <SiteHeader />
      <main data-section="operations" className="workspace-main workspace-polish max-w-xl">
        <InvitationAccept token={token} />
      </main>
      <SiteFooter />
    </>
  );
}
