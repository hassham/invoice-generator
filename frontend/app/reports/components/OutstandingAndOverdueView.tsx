"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getOutstandingReport,
  getOverdueReport,
  exportOutstandingInvoicesCsv,
  exportOverdueInvoicesCsv,
  OutstandingInvoice,
  OverdueInvoice,
} from "../../lib/dashboard";

type ReportType = "outstanding" | "overdue";

interface Invoice extends OutstandingInvoice, OverdueInvoice {}

interface Props {
  type: ReportType;
}

export function OutstandingAndOverdueView({ type }: Props) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const loadReport = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = type === "outstanding" ? await getOutstandingReport() : await getOverdueReport();
        setInvoices(data as Invoice[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : `Failed to load ${type} invoices`);
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, [type]);

  const title = type === "outstanding" ? "Outstanding Invoices" : "Overdue Invoices";
  const description =
    type === "outstanding"
      ? "Invoices with remaining balance to be paid"
      : "Invoices past their due date with remaining balance";

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
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${type}-invoices.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to export ${type} invoices`);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return <div className="text-center text-gray-500">Loading {title.toLowerCase()}...</div>;
  }

  if (error) {
    return <div className="text-center text-red-500">Error: {error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-sm text-gray-600 mt-1">{description}</p>
        </div>
        {invoices.length > 0 && (
          <button
            onClick={handleExport}
            disabled={exporting}
            className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:bg-gray-400"
          >
            {exporting ? "Exporting..." : "Export to CSV"}
          </button>
        )}
      </div>

      {invoices.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {type === "outstanding"
            ? "No outstanding invoices - all paid up!"
            : "No overdue invoices - great work!"}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-300">
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Invoice</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Customer</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Due Date</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-900">Amount Due</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-900">Action</th>
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
                      View
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
          Total {type === "outstanding" ? "outstanding" : "overdue"}:{" "}
          <span className="font-semibold text-gray-900">
            {invoices.length} {invoices.length === 1 ? "invoice" : "invoices"}
          </span>
        </p>
      </div>
    </div>
  );
}
