import type { Metadata } from "next";
import Link from "next/link";
import { PublicDocumentShell } from "../components/ui/PublicDocumentShell";
import styles from "../components/ui/PublicDocument.module.css";

const title = "Terms of Service";

export const metadata: Metadata = {
  title,
  description: "The terms that apply when you use Bevorly.",
  alternates: { canonical: "/terms" },
  openGraph: { title, url: "/terms" },
};

/**
 * IG-320: placeholder terms of service. The operator name and contact details are placeholders until
 * they are supplied. This text needs a review by a lawyer before launch.
 */
export default function TermsPage() {
  return (
    <PublicDocumentShell>
      <article className={styles.policy}>
        <h1 className="text-3xl font-bold text-ink sm:text-4xl">Terms of Service</h1>
        <p className="mt-2 text-sm text-muted">Draft placeholder. Last updated: [date].</p>

        <section className="mt-8 space-y-3">
          <h2 className="text-xl font-semibold text-ink">About these terms</h2>
          <p>
            These terms apply when you use Bevorly, which is operated by [legal entity name]. Contact us at [contact
            email].
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-xl font-semibold text-ink">Your account</h2>
          <p>
            You are responsible for keeping your sign-in details secure and for everything done through your account. You
            must give accurate business details and only send invoices you are entitled to send.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-xl font-semibold text-ink">Your content</h2>
          <p>
            You own the invoices, estimates and other content you create. You give us permission to store and process it
            so we can provide the app to you.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-xl font-semibold text-ink">Invoices and tax</h2>
          <p>
            Bevorly helps you produce invoices. You are responsible for their accuracy, including tax rates and any
            tax or accounting obligations. Check the default tax rate for your business before issuing invoices.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-xl font-semibold text-ink">Availability and liability</h2>
          <p>
            We work to keep the app available, but we do not promise it will be uninterrupted. To the extent the law allows,
            our liability is limited. [Liability and warranty wording to be reviewed.]
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-xl font-semibold text-ink">Ending your account</h2>
          <p>You can stop using Bevorly at any time. We may suspend or end accounts that break these terms.</p>
        </section>

        <p className="mt-10 text-sm">
          See also our <Link href="/privacy" className="underline">Privacy Policy</Link>.
        </p>
      </article>
    </PublicDocumentShell>
  );
}
