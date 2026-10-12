import type { Metadata } from "next";
import { SiteFooter } from "../../components/landing/SiteFooter";
import { SiteHeader } from "../../components/landing/SiteHeader";
import { InvitationAccept } from "./components/InvitationAccept";

export const metadata: Metadata = {
  title: "Team invitation | Invoice App",
  description: "Accept an invitation to help manage a business.",
};

export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-xl px-6 py-16">
        <InvitationAccept token={token} />
      </main>
      <SiteFooter />
    </>
  );
}
