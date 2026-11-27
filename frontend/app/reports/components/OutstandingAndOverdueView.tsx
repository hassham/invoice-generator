"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getOutstandingReport,
  getOverdueReport,
  exportOutstandingInvoicesCsv,
  exportOverdueInvoicesCsv,
  exportOutstandingInvoicesPdf,
  exportOverdueInvoicesPdf,
  OutstandingInvoice,
  OverdueInvoice,
} from "../../lib/dashboard";
import { t, type MessageKey } from "../../lib/messages";
import { downloadExport } from "../lib/downloadExport";

type ReportType = "outstanding" | "overdue";

interface Invoice extends OutstandingInvoice, OverdueInvoice {}

interface Props {
  type: ReportType;
}

// Text keys per report type. Each type has its own keys so translators can word them separately.
const keysFor: Record<
  ReportType,
  {
    title: MessageKey;
    description: MessageKey;
    loading: MessageKey;
    empty: MessageKey;
    total: MessageKey;
    loadError: MessageKey;
    exportError: MessageKey;
  }
> = {
  outstanding: {
    title: "reports.outstanding.title",
    description: "reports.outstanding.description",
    loading: "reports.outstanding.loading",
    empty: "reports.outstanding.empty",
    total: "reports.outstanding.total",
    loadError: "reports.outstanding.loadError",
    exportError: "reports.outstanding.exportError",
  },
  overdue: {
    title: "reports.overdue.title",
    description: "reports.overdue.description",
    loading: "reports.overdue.loading",
    empty: "reports.overdue.empty",
    total: "reports.overdue.total",
    loadError: "reports.overdue.loadError",
    exportError: "reports.overdue.exportError",
  },
};

export function OutstandingAndOverdueView({ type }: Props) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const keys = keysFor[type];

  useEffect(() => {
    const loadReport = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = type === "outstanding" ? await getOutstandingReport() : await getOverdueReport();
        setInvoices(data as Invoice[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : t(keysFor[type].loadError));
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, [type]);

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + "T00:00:00Z");
    return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const blob =
        type === "outstanding"
          ? await exportOutstandingInvoicesCsv()
          : await exportOverdueInvoicesCsv();
      downloadExport(blob, `${type}-invoices.csv`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t(keys.exportError));
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = async () => {
    try {
      setExportingPdf(true);
      const blob =
        type === "outstanding"
          ? await exportOutstandingInvoicesPdf()
          : await exportOverdueInvoicesPdf();
      downloadExport(blob, `${type}-invoices.pdf`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t(keys.exportError));
    } finally {
      setExportingPdf(false);
    }
  };

  if (loading) {
    return <div className="text-center text-muted">{t(keys.loading)}</div>;
  }

  if (error) {
    return <div role="alert" className="workspace-state workspace-error">{t("reports.error.display", { message: error })}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="workspace-heading">{t(keys.title)}</h1>
          <p className="text-sm text-muted mt-1">{t(keys.description)}</p>
        </div>
        {invoices.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="workspace-button-secondary"
            >
              {exporting ? t("reports.export.busy") : t("reports.export.csv")}
            </button>
            <button
              onClick={handleExportPdf}
              disabled={exportingPdf}
              className="workspace-button-secondary"
            >
              {exportingPdf ? t("reports.export.busy") : t("reports.export.pdf")}
            </button>
          </div>
        )}
      </div>

      {invoices.length === 0 ? (
        <div className="text-center py-8 text-muted">{t(keys.empty)}</div>
      ) : (
        <div role="region" aria-label="Outstanding and overdue invoices" tabIndex={0} className="workspace-table-scroll">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-semibold text-ink">{t("reports.column.invoice")}</th>
                <th className="text-left py-3 px-4 font-semibold text-ink">{t("reports.column.customer")}</th>
                <th className="text-left py-3 px-4 font-semibold text-ink">{t("reports.column.dueDate")}</th>
                <th className="text-right tabular-nums py-3 px-4 font-semibold text-ink">{t("reports.column.amountDue")}</th>
                <th className="text-center py-3 px-4 font-semibold text-ink">{t("reports.column.action")}</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="border-b border-border hover:bg-canvas">
                  <td className="py-3 px-4 text-ink font-medium">{invoice.invoiceNumber}</td>
                  <td className="py-3 px-4 text-ink">{invoice.customerName}</td>
                  <td className="py-3 px-4 text-ink">{formatDate(invoice.dueDate)}</td>
                  <td className="py-3 px-4 text-right tabular-nums font-medium text-ink">
                    {formatCurrency(invoice.amountDue, invoice.currency)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Link
                      href={`/documents/invoices/${invoice.id}`}
                      className="text-ink hover:text-status-sent-fg text-sm font-medium"
                    >
                      {t("reports.action.view")}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="text-sm text-muted mt-4">
        <p>
          {t(keys.total)}{" "}
          <span className="font-semibold text-ink">
            {t(invoices.length === 1 ? "reports.count.one" : "reports.count.many", { count: invoices.length })}
          </span>
        </p>
      </div>
    </div>
  );
}
