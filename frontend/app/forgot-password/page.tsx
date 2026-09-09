import type { Metadata } from "next";
import { SiteFooter } from "../components/landing/SiteFooter";
import { SiteHeader } from "../components/landing/SiteHeader";
import { ForgotPasswordForm } from "./components/ForgotPasswordForm";

const title = "Forgot Password | Invoice App";
const description = "Reset your Invoice App account password.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/forgot-password",
  },
};

export default function ForgotPasswordPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <ForgotPasswordForm />
      </main>
      <SiteFooter />
    </>
  );
}
