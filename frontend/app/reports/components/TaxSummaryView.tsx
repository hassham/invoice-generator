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
    return <div className="text-center text-gray-500">{t("reports.tax.loading")}</div>;
  }

  if (error) {
    return <div className="text-center text-red-500">{t("reports.error.display", { message: error })}</div>;
  }

  if (!summary) {
    return <div className="text-center text-gray-500">{t("reports.tax.noData")}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("reports.tax.title")}</h1>
          <p className="text-sm text-gray-600 mt-1">{t("reports.tax.description")}</p>
        </div>
        {summary.totalTaxCollected > 0 && (
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

      {summary.totalTaxCollected === 0 ? (
        <div className="text-center py-8 text-gray-500">{t("reports.tax.noneCollected")}</div>
      ) : (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-600">{t("reports.column.taxableAmount")}</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {formatCurrency(summary.totalTaxableAmount, summary.currency)}
              </p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-600">{t("reports.column.taxCollected")}</p>
              <p className="text-2xl font-bold text-blue-600 mt-2">
                {formatCurrency(summary.totalTaxCollected, summary.currency)}
              </p>
            </div>
          </div>

          {/* Taxes by Rate Table */}
          {summary.taxesByRate.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-300">
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">{t("reports.column.taxRate")}</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-900">{t("reports.column.taxableAmount")}</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-900">{t("reports.column.taxCollected")}</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.taxesByRate.map((tax, idx) => (
                    <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-900">{tax.taxRate.toFixed(2)}%</td>
                      <td className="py-3 px-4 text-right font-medium text-gray-900">
                        {formatCurrency(tax.taxableAmount, summary.currency)}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-gray-900">
                        {formatCurrency(tax.taxCollected, summary.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="pt-4 border-t border-gray-300">
            <p className="text-sm text-gray-600">{t("reports.tax.footnote")}</p>
          </div>
        </div>
      )}
    </div>
  );
}
