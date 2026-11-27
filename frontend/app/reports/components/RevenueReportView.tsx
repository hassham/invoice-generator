"use client";

import { useEffect, useState } from "react";
import {
  getRevenueReport,
  RevenueReport,
  exportRevenueReportCsv,
  exportRevenueReportPdf,
} from "../../lib/dashboard";
import { t, type MessageKey } from "../../lib/messages";
import { downloadExport } from "../lib/downloadExport";

const periodLabelKeys: Record<"month" | "quarter" | "year", MessageKey> = {
  month: "reports.revenue.byMonth",
  quarter: "reports.revenue.byQuarter",
  year: "reports.revenue.byYear",
};

export function RevenueReportView() {
  const [periodType, setPeriodType] = useState<"month" | "quarter" | "year">("month");
  const [report, setReport] = useState<RevenueReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [startDate, setStartDate] = useState<string>();
  const [endDate, setEndDate] = useState<string>();

  useEffect(() => {
    const loadReport = async () => {
      try {
        setLoading(true);
        setError(null);

        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth();

        let start: string | undefined;
        let end: string | undefined;

        if (periodType === "month") {
          start = `${year}-${String(month + 1).padStart(2, "0")}-01`;
          const lastDay = new Date(year, month + 1, 0).getDate();
          end = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
        } else if (periodType === "quarter") {
          const quarter = Math.floor(month / 3);
          const quarterStart = quarter * 3;
          start = `${year}-${String(quarterStart + 1).padStart(2, "0")}-01`;
          const quarterEndMonth = quarterStart + 2;
          const lastDay = new Date(year, quarterEndMonth + 1, 0).getDate();
          end = `${year}-${String(quarterEndMonth + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
        } else if (periodType === "year") {
          start = `${year}-01-01`;
          end = `${year}-12-31`;
        }

        setStartDate(start);
        setEndDate(end);

        const data = await getRevenueReport(periodType, start, end);
        setReport(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("reports.revenue.loadError"));
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, [periodType]);

  const handleExport = async () => {
    try {
      setExporting(true);
      const blob = await exportRevenueReportCsv(periodType, startDate, endDate);
      downloadExport(blob, `revenue-report-${periodType}.csv`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("reports.revenue.exportError"));
    } finally {
      setExporting(false);
    }
  };

  // IG-275: the same period and dates the table above was built from, so the PDF cannot disagree
  // with what is on screen.
  const handleExportPdf = async () => {
    try {
      setExportingPdf(true);
      const blob = await exportRevenueReportPdf(periodType, startDate, endDate);
      downloadExport(blob, `revenue-report-${periodType}.pdf`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("reports.revenue.exportError"));
    } finally {
      setExportingPdf(false);
    }
  };

  if (loading) {
    return <div role="status" className="workspace-state">{t("reports.revenue.loading")}</div>;
  }

  if (error) {
    return <div role="alert" className="workspace-state workspace-error">{t("reports.error.display", { message: error })}</div>;
  }

  if (!report) {
    return <div className="text-center text-muted">{t("reports.revenue.noData")}</div>;
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: report.currency,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="workspace-heading">{t("reports.revenue.title")}</h1>
        <p className="text-sm text-muted mt-1">{t("reports.revenue.subtitle", { period: periodType })}</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(["month", "quarter", "year"] as const).map((period) => (
            <button
              key={period}
              type="button"
              aria-pressed={periodType === period}
              onClick={() => setPeriodType(period)}
              className={`workspace-tab ${
                periodType === period
                  ? "workspace-tab-active"
                  : "workspace-tab-idle"
              }`}
            >
              {t(periodLabelKeys[period])}
            </button>
          ))}
        </div>
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
      </div>

      <div role="region" aria-label="Revenue report" tabIndex={0} className="workspace-table-scroll">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 font-semibold text-ink">{t("reports.column.period")}</th>
              <th className="text-right tabular-nums py-3 px-4 font-semibold text-ink">{t("reports.column.revenue")}</th>
            </tr>
          </thead>
          <tbody>
            {report.periods.map((period) => (
              <tr key={period.period} className="border-b border-border hover:bg-canvas">
                <td className="py-3 px-4 text-ink">{period.period}</td>
                <td className="py-3 px-4 text-right tabular-nums font-medium text-ink">
                  {formatCurrency(period.revenue)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {report.periods.every((p) => p.revenue === 0) && (
        <div className="text-center py-8 text-muted">
          {t("reports.revenue.empty")}
        </div>
      )}
    </div>
  );
}
