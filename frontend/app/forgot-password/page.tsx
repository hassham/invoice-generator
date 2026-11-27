import type { Metadata } from "next";
import { SiteFooter } from "../components/landing/SiteFooter";
import { SiteHeader } from "../components/landing/SiteHeader";
import { ForgotPasswordForm } from "./components/ForgotPasswordForm";

const title = "Forgot Password";
const description = "Reset your Bevorly account password.";

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
