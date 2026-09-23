"use client";

import { useEffect, useState } from "react";
import { getRevenueByCustomer, RevenueByCustomer } from "../../lib/dashboard";

export function RevenueByCustomerView() {
  const [customers, setCustomers] = useState<RevenueByCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadReport = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getRevenueByCustomer();
        setCustomers(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load revenue by customer");
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

  if (loading) {
    return <div className="text-center text-gray-500">Loading revenue by customer...</div>;
  }

  if (error) {
    return <div className="text-center text-red-500">Error: {error}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Revenue by Customer</h1>
        <p className="text-sm text-gray-600 mt-1">Revenue breakdown by customer for current month</p>
      </div>

      {customers.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No customers have invoices yet</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Customer</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-900">Revenue</th>
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
              <span>Total Revenue</span>
              <span>{formatCurrency(totalRevenue, customers[0]?.currency || "USD")}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
