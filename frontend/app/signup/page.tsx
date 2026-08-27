import type { Metadata } from "next";
import { SiteFooter } from "../components/landing/SiteFooter";
import { SiteHeader } from "../components/landing/SiteHeader";
import { RegisterForm } from "./components/RegisterForm";

const title = "Sign Up | Invoice App";
const description = "Create an Invoice App account.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/signup",
  },
};

export default function SignupPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <RegisterForm />
      </main>
      <SiteFooter />
    </>
  );
}
