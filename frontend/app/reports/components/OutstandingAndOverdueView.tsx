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
    return <div className="text-center text-gray-500">{t(keys.loading)}</div>;
  }

  if (error) {
    return <div className="text-center text-red-500">{t("reports.error.display", { message: error })}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t(keys.title)}</h1>
          <p className="text-sm text-gray-600 mt-1">{t(keys.description)}</p>
        </div>
        {invoices.length > 0 && (
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:bg-gray-400"
            >
              {exporting ? t("reports.export.busy") : t("reports.export.csv")}
            </button>
            <button
              onClick={handleExportPdf}
              disabled={exportingPdf}
              className="px-4 py-2 bg-slate-700 text-white rounded-md text-sm font-medium hover:bg-slate-800 disabled:bg-gray-400"
            >
              {exportingPdf ? t("reports.export.busy") : t("reports.export.pdf")}
            </button>
          </div>
        )}
      </div>

      {invoices.length === 0 ? (
        <div className="text-center py-8 text-gray-500">{t(keys.empty)}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-300">
                <th className="text-left py-3 px-4 font-semibold text-gray-900">{t("reports.column.invoice")}</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">{t("reports.column.customer")}</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">{t("reports.column.dueDate")}</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-900">{t("reports.column.amountDue")}</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-900">{t("reports.column.action")}</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-blue-600 font-medium">{invoice.invoiceNumber}</td>
                  <td className="py-3 px-4 text-gray-900">{invoice.customerName}</td>
                  <td className="py-3 px-4 text-gray-900">{formatDate(invoice.dueDate)}</td>
                  <td className="py-3 px-4 text-right font-medium text-gray-900">
                    {formatCurrency(invoice.amountDue, invoice.currency)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Link
                      href={`/documents/invoices/${invoice.id}`}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
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

      <div className="text-sm text-gray-600 mt-4">
        <p>
          {t(keys.total)}{" "}
          <span className="font-semibold text-gray-900">
            {t(invoices.length === 1 ? "reports.count.one" : "reports.count.many", { count: invoices.length })}
          </span>
        </p>
      </div>
    </div>
  );
}
