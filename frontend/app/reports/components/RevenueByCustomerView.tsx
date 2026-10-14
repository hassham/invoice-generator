"use client";

import { useEffect, useState } from "react";
import {
  getRevenueByCustomer,
  exportRevenueByCustomerCsv,
  exportRevenueByCustomerPdf,
  RevenueByCustomer,
} from "../../lib/dashboard";
import { t } from "../../lib/messages";
import { downloadExport } from "../lib/downloadExport";

export function RevenueByCustomerView() {
  const [customers, setCustomers] = useState<RevenueByCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  useEffect(() => {
    const loadReport = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getRevenueByCustomer();
        setCustomers(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("reports.byCustomer.loadError"));
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

  const totalRevenue = customers.reduce((sum, c) => sum + c.revenue, 0);

  const handleExport = async () => {
    try {
      setExporting(true);
      const blob = await exportRevenueByCustomerCsv();
      downloadExport(blob, "revenue-by-customer.csv");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("reports.byCustomer.exportError"));
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = async () => {
    try {
      setExportingPdf(true);
      const blob = await exportRevenueByCustomerPdf();
      downloadExport(blob, "revenue-by-customer.pdf");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("reports.byCustomer.exportError"));
    } finally {
      setExportingPdf(false);
    }
  };

  if (loading) {
    return <div className="text-center text-gray-500">{t("reports.byCustomer.loading")}</div>;
  }

  if (error) {
    return <div className="text-center text-red-500">{t("reports.error.display", { message: error })}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("reports.byCustomer.title")}</h1>
          <p className="text-sm text-gray-600 mt-1">{t("reports.byCustomer.description")}</p>
        </div>
        {customers.length > 0 && (
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

      {customers.length === 0 ? (
        <div className="text-center py-8 text-gray-500">{t("reports.byCustomer.empty")}</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">{t("reports.column.customer")}</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-900">{t("reports.column.revenue")}</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.customerId} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-900">{customer.customerName}</td>
                    <td className="py-3 px-4 text-right font-medium text-gray-900">
                      {formatCurrency(customer.revenue, customer.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pt-4 border-t border-gray-300">
            <div className="flex justify-between font-semibold text-gray-900">
              <span>{t("reports.byCustomer.total")}</span>
              <span>{formatCurrency(totalRevenue, customers[0]?.currency || "USD")}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
