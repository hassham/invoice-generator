import Link from "next/link";
import { useId, type ReactNode } from "react";
import styles from "./WorkspaceCollection.module.css";

export type WorkspaceArea = "invoice" | "customer" | "item";
const shapes: Record<WorkspaceArea | "arrow" | "plus", string> = {
  invoice: "M6 3h9l4 4v14H6z M14 3v5h5 M9 12h7 M9 16h5",
  customer: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v2Z",
  item: "m3 7 9-4 9 4v10l-9 4-9-4V7Zm0 0 9 4 9-4M12 11v10m-4.5-16 9 4",
  arrow: "M4 12h15m-5-5 5 5-5 5",
  plus: "M12 5v14M5 12h14",
};

function Mark({ name }: { name: keyof typeof shapes }) {
  return <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round"><path d={shapes[name]} /></svg>;
}

export function WorkspaceHeading({ area, eyebrow, title, description, actions, back }: {
  area: WorkspaceArea; eyebrow: string; title: string; description?: ReactNode; actions?: ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <header className={styles.hero} data-area={area}>
      <div className={styles.headingText}>
        {back ? <Link href={back.href} className={styles.back}>← {back.label}</Link> : null}
        <p className={styles.eyebrow}><span aria-hidden="true" />{eyebrow}</p>
        <h1>{title}</h1>
        {description ? <div className={styles.description}>{description}</div> : null}
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </header>
  );
}

export function WorkspaceCreateLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href} className={"workspace-button-primary " + styles.primary}><Mark name="plus" />{children}</Link>;
}

export function WorkspaceRowLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href} className={styles.rowAction}>{children}<Mark name="arrow" /></Link>;
}

export function WorkspaceRowButton({ children, danger = false, ...props }: Omit<React.ComponentPropsWithoutRef<"button">, "className"> & { danger?: boolean }) {
  return <button type="button" {...props} className={styles.rowAction} data-danger={danger}>{children}</button>;
}

export function WorkspaceRecordName({ area, children }: { area: WorkspaceArea; children: ReactNode }) {
  return <span className={styles.record} data-area={area}><span className={styles.recordMark}><Mark name={area} /></span><span>{children}</span></span>;
}

export function WorkspaceState({ area, kind, children, action }: { area: WorkspaceArea; kind: "loading" | "empty" | "error"; children: ReactNode; action?: ReactNode }) {
  return <div className={styles.state} data-area={area} data-kind={kind}>
    <span className={styles.recordMark}><Mark name={area} /></span>
    <div role={kind === "error" ? "alert" : kind === "loading" ? "status" : undefined}>{children}</div>
    {action ? <div className={styles.stateAction}>{action}</div> : null}
  </div>;
}

type Column<Row> = { key: string; label: string; render: (row: Row) => ReactNode; align?: "end"; wide?: boolean };
export function WorkspaceCollection<Row>({ area, title, caption, note, columns, rows, rowKey, footer }: {
  area: WorkspaceArea; title: string; caption: string; note?: string; columns: Column<Row>[];
  rows: Row[]; rowKey: (row: Row) => string; footer?: ReactNode;
}) {
  const id = useId();
  return (
    <section className={styles.collection} data-area={area} aria-labelledby={id}>
      <div className={styles.panelHeader}>
        <span className={styles.recordMark}><Mark name={area} /></span>
        <div><h2 id={id}>{title}</h2>{note ? <p>{note}</p> : null}</div>
      </div>
      {/* Explicit roles preserve the table structure when CSS stacks its rows on phones. */}
      <table role="table" className={styles.table}>
        <caption className="sr-only">{caption}</caption>
        <thead role="rowgroup">
          <tr role="row">{columns.map((c) => <th id={id + "-" + c.key} key={c.key} role="columnheader" scope="col" data-align={c.align}>{c.label}</th>)}</tr>
        </thead>
        <tbody role="rowgroup">
          {rows.map((row) => <tr key={rowKey(row)} role="row">{columns.map((c) => (
            <td key={c.key} role="cell" headers={id + "-" + c.key} data-align={c.align} data-wide={c.wide || undefined}>
              <span className={styles.mobileLabel} aria-hidden="true">{c.label}</span>
              {c.render(row)}
            </td>
          ))}</tr>)}
        </tbody>
      </table>
      {footer ? <div className={styles.footer}>{footer}</div> : null}
    </section>
  );
}
