"use client";

import { useEffect, useState } from "react";
import { getTaxSummary, exportTaxSummaryCsv, TaxSummary } from "../../lib/dashboard";

export function TaxSummaryView() {
  const [summary, setSummary] = useState<TaxSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const loadReport = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getTaxSummary();
        setSummary(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load tax summary");
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
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "tax-summary.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export tax summary");
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return <div className="text-center text-gray-500">Loading tax summary...</div>;
  }

  if (error) {
    return <div className="text-center text-red-500">Error: {error}</div>;
  }

  if (!summary) {
    return <div className="text-center text-gray-500">No tax data available</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tax Summary</h1>
          <p className="text-sm text-gray-600 mt-1">Tax collected for current month</p>
        </div>
        {summary.totalTaxCollected > 0 && (
          <button
            onClick={handleExport}
            disabled={exporting}
            className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:bg-gray-400"
          >
            {exporting ? "Exporting..." : "Export to CSV"}
          </button>
        )}
      </div>

      {summary.totalTaxCollected === 0 ? (
        <div className="text-center py-8 text-gray-500">No tax collected for this period</div>
      ) : (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-600">Taxable Amount</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {formatCurrency(summary.totalTaxableAmount, summary.currency)}
              </p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-600">Tax Collected</p>
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
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Tax Rate</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-900">Taxable Amount</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-900">Tax Collected</th>
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
            <p className="text-sm text-gray-600">
              Based on invoices issued in the current month with tax amounts calculated at time of issue.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
