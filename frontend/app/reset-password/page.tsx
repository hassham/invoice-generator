import type { Metadata } from "next";
import { Suspense } from "react";
import { SiteFooter } from "../components/landing/SiteFooter";
import { SiteHeader } from "../components/landing/SiteHeader";
import { ResetPasswordForm } from "./components/ResetPasswordForm";

const title = "Reset Password | Invoice App";
const description = "Choose a new password for your Invoice App account.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/reset-password",
  },
};

export default function ResetPasswordPage() {
  return (
    <>
      <SiteHeader />
      <main>
        {/* ResetPasswordForm reads/writes the URL query string via useSearchParams
            (next/navigation) - the App Router requires a Suspense boundary around any such
            client component on a statically-rendered route, or `next build` fails with a
            "missing suspense boundary" error (same requirement InvoiceListView already has). */}
        <Suspense fallback={<p className="mx-auto max-w-md px-6 py-16 text-sm text-slate-600">Loading…</p>}>
          <ResetPasswordForm />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}
