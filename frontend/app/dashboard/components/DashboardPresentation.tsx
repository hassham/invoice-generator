import Link from "next/link";
import type { ReactNode } from "react";
import { StatusBadge, toneForInvoiceStatus } from "../../components/ui/StatusBadge";
import type { DashboardRecentInvoice, DashboardSummary } from "../../lib/dashboard";
import styles from "./DashboardView.module.css";

type IconName = "invoice" | "paid" | "outstanding" | "attention" | "arrow" | "plus" | "calendar";

const iconPaths: Record<IconName, string> = {
  invoice: "M6 3h9l4 4v14H6z M14 3v5h5 M9 12h7 M9 16h5",
  paid: "M4 6h16v12H4z M4 10h16 M9 14l2 2 4-4",
  outstanding: "M12 7v5l3 2 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  attention: "M12 4 3 20h18L12 4Z M12 9v5 M12 17h.01",
  arrow: "M5 12h14m-5-5 5 5-5 5",
  plus: "M12 5v14M5 12h14",
  calendar: "M5 5h14v15H5z M8 3v4m8-4v4M5 10h14m-10 4h2m2 0h2",
};

export function DashboardIcon({ name }: { name: IconName }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={styles.icon} fill="none"
      stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d={iconPaths[name]} />
    </svg>
  );
}

const number = new Intl.NumberFormat("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const shortDate = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

function money(amount: number, currency: string) {
  return currency + " " + number.format(amount);
}

export function formatDate(value: string) {
  const date = new Date(value + "T00:00:00Z");
  return Number.isNaN(date.valueOf()) ? value : shortDate.format(date);
}

const metrics = [
  { key: "totalInvoiced", label: "Total Invoiced", tone: "lavender", icon: "invoice", hint: "Issued in the selected period" },
  { key: "totalPaid", label: "Total Paid", tone: "mint", icon: "paid", hint: "Paid on invoices from this period" },
  { key: "outstanding", label: "Outstanding", tone: "yellow", icon: "outstanding", hint: "Unpaid balance today" },
  { key: "overdue", label: "Overdue", tone: "pink", icon: "attention", hint: "Past-due balance today" },
] as const;

export function DashboardMetrics({ summary }: { summary: DashboardSummary }) {
  return (
    <dl className={styles.metrics}>
      {metrics.map(({ key, label, tone, icon, hint }) => (
        <div className={styles.metric} data-tone={tone} key={key}>
          <dt className={styles.metricLabel}><span className={styles.iconTile}><DashboardIcon name={icon} /></span>{label}</dt>
          <dd className={styles.metricValue}>{money(summary[key], summary.currency)}</dd>
          <dd className={styles.metricHint}>{hint}</dd>
        </div>
      ))}
    </dl>
  );
}

export function DashboardAttention({ summary }: { summary: DashboardSummary }) {
  const overdue = summary.overdue > 0;
  return (
    <section aria-labelledby="dashboard-attention" className={styles.attention} data-overdue={overdue}>
      <span className={styles.attentionIcon}><DashboardIcon name={overdue ? "attention" : "paid"} /></span>
      <div className={styles.attentionCopy}>
        <h2 id="dashboard-attention" className={styles.sectionTitle}>Needs attention</h2>
        <p>{overdue ? money(summary.overdue, summary.currency) + " overdue today." : "You have no overdue balance."}</p>
      </div>
      {overdue ? (
        <Link className={"workspace-button-secondary " + styles.attentionAction} href="/reports/overdue">
          Review overdue invoices <DashboardIcon name="arrow" />
        </Link>
      ) : null}
    </section>
  );
}

const columns = [
  ["ref", "Invoice Number"],
  ["customer", "Customer"],
  ["issued", "Issue Date"],
  ["due", "Due Date"],
  ["amount", "Amount"],
  ["balance", "Amount Due"],
  ["status", "Status"],
  ["actions", "Actions"],
] as const;

type InvoiceColumn = typeof columns[number][0];

function InvoiceCell({ column, children }: { column: InvoiceColumn; children: ReactNode }) {
  const label = columns.find(([key]) => key === column)?.[1];
  return (
    <td role="cell" headers={"recent-" + column} data-column={column}>
      <span aria-hidden="true" className={styles.mobileLabel}>{label}</span>
      {children}
    </td>
  );
}

function InvoiceRow({ invoice }: { invoice: DashboardRecentInvoice }) {
  return (
    <tr role="row">
      <InvoiceCell column="ref">
        <span className={styles.invoiceRef}>
          <span className={styles.invoiceIcon}><DashboardIcon name="invoice" /></span>
          {invoice.invoiceNumber}
        </span>
      </InvoiceCell>
      <InvoiceCell column="customer">{invoice.customerName || "No customer name"}</InvoiceCell>
      <InvoiceCell column="issued"><time dateTime={invoice.issueDate}>{formatDate(invoice.issueDate)}</time></InvoiceCell>
      <InvoiceCell column="due"><time dateTime={invoice.dueDate}>{formatDate(invoice.dueDate)}</time></InvoiceCell>
      <InvoiceCell column="amount">{money(invoice.totalAmount, invoice.currency)}</InvoiceCell>
      <InvoiceCell column="balance">{money(invoice.amountDue, invoice.currency)}</InvoiceCell>
      <InvoiceCell column="status">
        <StatusBadge tone={toneForInvoiceStatus(invoice.status)} label={invoice.status === "PartiallyPaid" ? "Partially paid" : invoice.status} />
      </InvoiceCell>
      <InvoiceCell column="actions">
        <Link href={"/documents/invoices/" + invoice.id} aria-label={"View invoice " + invoice.invoiceNumber} className={styles.rowAction}>
          View <DashboardIcon name="arrow" />
        </Link>
      </InvoiceCell>
    </tr>
  );
}

export function RecentInvoices({ invoices }: { invoices: DashboardRecentInvoice[] }) {
  return (
    <section aria-labelledby="recent-title" className={styles.recent}>
      <div className={styles.recentHeader}>
        <div>
          <p className={styles.kicker}>Invoice activity</p>
          <h2 id="recent-title" className={styles.sectionTitle}>Recent Invoices</h2>
          <p className={styles.sectionCopy}>Your latest invoices, regardless of the selected period.</p>
        </div>
        <Link href="/documents/invoices" className={"workspace-button-secondary " + styles.viewAll}>
          View all invoices <DashboardIcon name="arrow" />
        </Link>
      </div>
      {/* Explicit table roles preserve its accessible structure when CSS stacks rows on phones. */}
      <table role="table" aria-labelledby="recent-title" className={styles.table}>
        <thead role="rowgroup">
          <tr role="row">
            {columns.map(([key, label]) => <th key={key} id={"recent-" + key} data-column={key} role="columnheader" scope="col">{label}</th>)}
          </tr>
        </thead>
        <tbody role="rowgroup">
          {invoices.map((invoice) => <InvoiceRow key={invoice.id} invoice={invoice} />)}
        </tbody>
      </table>
    </section>
  );
}

export function DashboardEmpty() {
  return (
    <section className={styles.empty} aria-labelledby="dashboard-empty">
      <svg aria-hidden="true" className={styles.doodle} viewBox="0 0 164 140" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M43 24h59v94H43z" fill="var(--color-lavender)" />
        <path d="M54 14h49l17 17v83H54z" fill="var(--color-paper)" />
        <path d="M103 14v17h17M66 41h25M66 53h42M66 65h37M66 77h22" />
        <circle cx="119" cy="97" r="22" fill="var(--color-accent)" />
        <path d="m109 97 7 7 13-15M29 43v17m-8-8h16m99-20v14m-7-7h14" />
      </svg>
      <div>
        <p className={styles.kicker}>A fresh start</p>
        <h2 id="dashboard-empty" className={styles.sectionTitle}>Create your first invoice.</h2>
        <p className={styles.sectionCopy}>Add a client and their line items. We’ll take care of the maths.</p>
        <Link href="/invoice/create" className={"workspace-button-primary " + styles.emptyAction}>
          <DashboardIcon name="plus" /> Create Invoice
        </Link>
      </div>
    </section>
  );
}
