"use client";

import { useEffect, useState } from "react";
import { getRevenueReport, RevenueReport, exportRevenueReportCsv } from "../../lib/dashboard";

export function RevenueReportView() {
  const [periodType, setPeriodType] = useState<"month" | "quarter" | "year">("month");
  const [report, setReport] = useState<RevenueReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
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
        setError(err instanceof Error ? err.message : "Failed to load revenue report");
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
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `revenue-report-${periodType}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export revenue report");
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return <div className="text-center text-gray-500">Loading revenue report...</div>;
  }

  if (error) {
    return <div className="text-center text-red-500">Error: {error}</div>;
  }

  if (!report) {
    return <div className="text-center text-gray-500">No data available</div>;
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
        <h1 className="text-2xl font-bold text-gray-900">Revenue Report</h1>
        <p className="text-sm text-gray-600 mt-1">Revenue by {periodType}</p>
      </div>

      <div className="flex gap-2 justify-between items-center">
        <div className="flex gap-2">
          {(["month", "quarter", "year"] as const).map((period) => (
            <button
              key={period}
              onClick={() => setPeriodType(period)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                periodType === period
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-800 hover:bg-gray-300"
              }`}
            >
              By {period.charAt(0).toUpperCase() + period.slice(1)}
            </button>
          ))}
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:bg-gray-400"
        >
          {exporting ? "Exporting..." : "Export to CSV"}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-300">
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Period</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-900">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {report.periods.map((period) => (
              <tr key={period.period} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4 text-gray-900">{period.period}</td>
                <td className="py-3 px-4 text-right font-medium text-gray-900">
                  {formatCurrency(period.revenue)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {report.periods.every((p) => p.revenue === 0) && (
        <div className="text-center py-8 text-gray-500">
          No revenue recorded for this period
        </div>
      )}
    </div>
  );
}
