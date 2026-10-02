"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CreateRecurringScheduleForm } from "./components/CreateRecurringScheduleForm";

interface Customer {
  id: string;
  name: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
}

export default function RecurringSchedulePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const businessId = searchParams.get("businessId") || "";
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    // In a real app, you'd fetch these from the API with proper auth
    // For now, using empty arrays
    // TODO: Implement actual data fetching once customer and invoice list endpoints are available
  }, []);

  const handleSuccess = () => {
    router.push(`/recurring?businessId=${businessId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-8">
            <h1 className="text-3xl font-bold text-gray-900">Create Recurring Schedule</h1>
            <p className="mt-2 text-gray-600">
              Set up a schedule to automatically generate invoices at regular intervals.
            </p>

            <div className="mt-8">
              <CreateRecurringScheduleForm
                businessId={businessId}
                customers={customers}
                invoices={invoices}
                onSuccess={handleSuccess}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
