import type { Metadata } from "next";
import Link from "next/link";
import { PublicDocumentShell } from "../components/ui/PublicDocumentShell";
import styles from "../components/ui/PublicDocument.module.css";

const title = "Privacy Policy";

export const metadata: Metadata = {
  title,
  description: "How Bevorly collects, uses and protects personal information.",
  alternates: { canonical: "/privacy" },
  openGraph: { title, url: "/privacy" },
};

/**
 * IG-320: placeholder privacy policy. The operator name and contact details are placeholders until
 * they are supplied. This text needs a review by a lawyer before launch.
 */
export default function PrivacyPolicyPage() {
  return (
    <PublicDocumentShell>
      <article className={styles.policy}>
        <h1 className="text-3xl font-bold text-ink sm:text-4xl">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted">Draft placeholder. Last updated: [date].</p>

        <section className="mt-8 space-y-3">
          <h2 className="text-xl font-semibold text-ink">Who we are</h2>
          <p>
            Bevorly is operated by [legal entity name]. You can contact us at [contact email].
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-xl font-semibold text-ink">What we collect</h2>
          <p>
            We collect the details you give us to run your account and your invoices: your name and email address, your
            business details, your customers&apos; contact details, and the invoices, estimates, receipts and other documents
            you create.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-xl font-semibold text-ink">Invoice emails and open tracking</h2>
          <p>
            When you email an invoice through Bevorly, the email includes a small tracking image. When the recipient
            opens the email and their mail app loads images, we record the time it was first opened and how many times it
            was opened. You can see this in the invoice&apos;s email history.
          </p>
          <p>
            Some mail apps block images, so an email with no recorded open may still have been read. You can turn tracking
            off for your business in Business settings. When tracking is off, no tracking image is added.
          </p>
          <p>
            Open records are kept with the invoice they belong to. [Retention wording to confirm: deleting an invoice in the
            app marks it deleted but currently keeps its email history.]
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-xl font-semibold text-ink">Who we share it with</h2>
          <p>
            We use service providers to run the app, including hosting, email delivery and payment processing. [List
            providers once chosen.] They process data only to provide their service to us.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-xl font-semibold text-ink">Your choices</h2>
          <p>
            You can update your business details, and turn invoice email tracking on or off, in Business settings. To ask
            for access to or deletion of your personal information, contact us at [contact email].
          </p>
        </section>

        <p className="mt-10 text-sm">
          See also our <Link href="/terms" className="underline">Terms of Service</Link>.
        </p>
      </article>
    </PublicDocumentShell>
  );
}
