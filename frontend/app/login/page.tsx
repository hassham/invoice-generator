import type { Metadata } from "next";
import { SiteFooter } from "../components/landing/SiteFooter";
import { SiteHeader } from "../components/landing/SiteHeader";
import { LoginForm } from "./components/LoginForm";

const title = "Log In | Invoice App";
const description = "Log in to your Invoice App account.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/login",
  },
};

export default function LoginPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <LoginForm />
      </main>
      <SiteFooter />
    </>
  );
}
