import Link from "next/link";
import { PublicDocumentShell } from "./components/ui/PublicDocumentShell";
import styles from "./components/ui/PublicDocument.module.css";

export const metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

/**
 * IG-331: shown for any URL the app doesn't serve. Kept free of app chrome and data calls so it
 * renders even when the rest of the app is unavailable.
 */
export default function NotFound() {
  return (
    <PublicDocumentShell>
      <section className={styles.policy}>
        <p className="font-mono text-sm font-bold uppercase tracking-widest text-muted">404</p>
        <h1 className="mt-2 text-3xl font-bold text-ink">Page not found</h1>
        <p className="mt-2 text-muted">The page you were looking for doesn&apos;t exist or has moved.</p>
        <Link href="/" className="workspace-button-primary mt-5">Go to the home page</Link>
      </section>
    </PublicDocumentShell>
  );
}
