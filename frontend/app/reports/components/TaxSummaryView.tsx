"use client";

import { useEffect, useState } from "react";
import {
  getTaxSummary,
  exportTaxSummaryCsv,
  exportTaxSummaryPdf,
  TaxSummary,
} from "../../lib/dashboard";
import { t } from "../../lib/messages";
import { downloadExport } from "../lib/downloadExport";

export function TaxSummaryView() {
  const [summary, setSummary] = useState<TaxSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  useEffect(() => {
    const loadReport = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getTaxSummary();
        setSummary(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("reports.tax.loadError"));
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, []);

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const blob = await exportTaxSummaryCsv();
      downloadExport(blob, "tax-summary.csv");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("reports.tax.exportError"));
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = async () => {
    try {
      setExportingPdf(true);
      const blob = await exportTaxSummaryPdf();
      downloadExport(blob, "tax-summary.pdf");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("reports.tax.exportError"));
    } finally {
      setExportingPdf(false);
    }
  };

  if (loading) {
    return <div role="status" className="workspace-state">{t("reports.tax.loading")}</div>;
  }

  if (error) {
    return <div role="alert" className="workspace-state workspace-error">{t("reports.error.display", { message: error })}</div>;
  }

  if (!summary) {
    return <div className="text-center text-muted">{t("reports.tax.noData")}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="workspace-heading">{t("reports.tax.title")}</h1>
          <p className="text-sm text-muted mt-1">{t("reports.tax.description")}</p>
        </div>
        {summary.totalTaxCollected > 0 && (
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

      {summary.totalTaxCollected === 0 ? (
        <div className="text-center py-8 text-muted">{t("reports.tax.noneCollected")}</div>
      ) : (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-canvas rounded-lg p-4">
              <p className="text-sm font-medium text-muted">{t("reports.column.taxableAmount")}</p>
              <p className="text-2xl font-bold text-ink mt-2">
                {formatCurrency(summary.totalTaxableAmount, summary.currency)}
              </p>
            </div>
            <div className="bg-status-sent-bg/55 rounded-lg p-4">
              <p className="text-sm font-medium text-muted">{t("reports.column.taxCollected")}</p>
              <p className="text-2xl font-bold text-ink mt-2">
                {formatCurrency(summary.totalTaxCollected, summary.currency)}
              </p>
            </div>
          </div>

          {/* Taxes by Rate Table */}
          {summary.taxesByRate.length > 0 && (
            <div role="region" aria-label="Tax summary" tabIndex={0} className="workspace-table-scroll">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-semibold text-ink">{t("reports.column.taxRate")}</th>
                    <th className="text-right tabular-nums py-3 px-4 font-semibold text-ink">{t("reports.column.taxableAmount")}</th>
                    <th className="text-right tabular-nums py-3 px-4 font-semibold text-ink">{t("reports.column.taxCollected")}</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.taxesByRate.map((tax, idx) => (
                    <tr key={idx} className="border-b border-border hover:bg-canvas">
                      <td className="py-3 px-4 text-ink">{tax.taxRate.toFixed(2)}%</td>
                      <td className="py-3 px-4 text-right tabular-nums font-medium text-ink">
                        {formatCurrency(tax.taxableAmount, summary.currency)}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums font-medium text-ink">
                        {formatCurrency(tax.taxCollected, summary.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="pt-4 border-t border-border">
            <p className="text-sm text-muted">{t("reports.tax.footnote")}</p>
          </div>
        </div>
      )}
    </div>
  );
}
