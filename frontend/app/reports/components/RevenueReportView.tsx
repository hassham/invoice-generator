"use client";

import { useEffect, useState } from "react";
import { getRevenueReport, RevenueReport } from "../../lib/dashboard";

export function RevenueReportView() {
  const [periodType, setPeriodType] = useState<"month" | "quarter" | "year">("month");
  const [report, setReport] = useState<RevenueReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadReport = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getRevenueReport(periodType);
        setReport(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load revenue report");
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, [periodType]);

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
