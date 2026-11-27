import Link from "next/link";
import { useId, type ReactNode } from "react";
import styles from "./WorkspaceRecordForm.module.css";

type Kind = "customer" | "item";

export function RecordFormSection({ number, title, description, children }: {
  number: string; title: string; description: string; children: ReactNode;
}) {
  const id = useId();
  return <section className={styles.section} aria-labelledby={id}>
    <div className={styles.sectionHeader}>
      <span className={styles.number} aria-hidden="true">{number}</span>
      <div><h2 id={id}>{title}</h2><p>{description}</p></div>
    </div>
    <div className={styles.fields}>{children}</div>
  </section>;
}

export function RecordFormLayout({ kind, preview, children }: { kind: Kind; preview?: ReactNode; children: ReactNode }) {
  return <div className={styles.layout} data-kind={kind} data-preview={Boolean(preview)}>
    <div className={styles.sheet}>{children}</div>
    {preview ? <aside className={styles.preview} aria-label={kind === "customer" ? "Customer preview" : "Item preview"}>
      {preview}
    </aside> : null}
  </div>;
}

export function RecordFormPreview({ kind, title, children }: { kind: Kind; title: string; children: ReactNode }) {
  return <>
    <div className={styles.previewHeader}>
      <p>{kind === "customer" ? "Billing contact" : "Invoice line item"}</p>
      <svg aria-hidden="true" width="54" height="42" viewBox="0 0 54 42" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <rect x="6" y="7" width="34" height="28" rx="5" fill="var(--color-paper)" />
        {kind === "customer" ? <path d="M17 21a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-6 7a6 6 0 0 1 12 0m4-11h7m-7 6h7m-7 5h4" /> : <path d="m13 19 8-4 8 4v9l-8 4-8-4v-9Zm0 0 8 4 8-4m-8 4v9" />}
        <circle cx="41" cy="30" r="8" fill="var(--color-accent)" />
        <path d="m38 30 2 2 4-4M43 5v7m-3.5-3.5h7" />
      </svg>
    </div>
    <p className={styles.previewName}>{title}</p>
    <div className={styles.previewMeta}>{children}</div>
    <p className={styles.previewFoot}>Preview · updates as you type</p>
  </>;
}

export function RecordFormActions({ pending, label, cancelHref }: { pending: boolean; label: string; cancelHref?: string }) {
  return <div className={styles.actions}>
    {cancelHref ? <Link href={cancelHref} className="workspace-button-secondary">Cancel</Link> : null}
    <button type="submit" disabled={pending} className="workspace-button-primary">{pending ? "Saving\u2026" : label}</button>
  </div>;
}
