import Link from "next/link";
import { useId, type ReactNode } from "react";
import styles from "./SettingsChrome.module.css";

export function SettingsHeading({ page, title, description }: {
  page: "business" | "team"; title: string; description: string;
}) {
  return (
    <header className={styles.heading}>
      <p className={styles.kicker}>Workspace / Settings</p>
      <h1>{title}</h1>
      <p className={styles.description}>{description}</p>
      <nav className={styles.navigation} aria-label="Settings pages">
        <Link href="/settings/business" aria-current={page === "business" ? "page" : undefined}>Business Profile</Link>
        <Link href="/settings/team" aria-current={page === "team" ? "page" : undefined}>Team</Link>
      </nav>
    </header>
  );
}

export function SettingsPanel({ id, tone, title, description, children }: {
  id?: string; tone: "lavender" | "mint" | "yellow"; title: string; description?: string; children: ReactNode;
}) {
  const label = useId();
  return (
    <section id={id} tabIndex={id ? -1 : undefined} className={styles.panel} data-tone={tone} aria-labelledby={label}>
      <header className={styles.panelHeading}>
        <h2 id={label}>{title}</h2>
        {description ? <p>{description}</p> : null}
      </header>
      <div className={styles.panelBody}>{children}</div>
    </section>
  );
}

export function SettingsNotice({ kind, children }: { kind: "error" | "success" | "info"; children: ReactNode }) {
  return <p role={kind === "error" ? "alert" : "status"} className={styles.notice} data-kind={kind}>{children}</p>;
}
