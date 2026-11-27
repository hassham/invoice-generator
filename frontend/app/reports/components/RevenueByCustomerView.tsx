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
    return <div role="status" className="workspace-state">{t("reports.byCustomer.loading")}</div>;
  }

  if (error) {
    return <div role="alert" className="workspace-state workspace-error">{t("reports.error.display", { message: error })}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="workspace-heading">{t("reports.byCustomer.title")}</h1>
          <p className="text-sm text-muted mt-1">{t("reports.byCustomer.description")}</p>
        </div>
        {customers.length > 0 && (
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

      {customers.length === 0 ? (
        <div className="text-center py-8 text-muted">{t("reports.byCustomer.empty")}</div>
      ) : (
        <>
          <div role="region" aria-label="Revenue by customer" tabIndex={0} className="workspace-table-scroll">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold text-ink">{t("reports.column.customer")}</th>
                  <th className="text-right tabular-nums py-3 px-4 font-semibold text-ink">{t("reports.column.revenue")}</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.customerId} className="border-b border-border hover:bg-canvas">
                    <td className="py-3 px-4 text-ink">{customer.customerName}</td>
                    <td className="py-3 px-4 text-right tabular-nums font-medium text-ink">
                      {formatCurrency(customer.revenue, customer.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pt-4 border-t border-border">
            <div className="flex justify-between font-semibold text-ink">
              <span>{t("reports.byCustomer.total")}</span>
              <span>{formatCurrency(totalRevenue, customers[0]?.currency || "USD")}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
