"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CreateRecurringScheduleForm } from "./CreateRecurringScheduleForm";
import { RecurringScheduleList } from "./RecurringScheduleList";
import { listRecurringSchedules, RecurringSchedule } from "../../lib/recurring";

interface Customer {
  id: string;
  name: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
}

export function RecurringScheduleContent() {
  const searchParams = useSearchParams();
  const businessId = searchParams.get("businessId") || "";
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [schedules, setSchedules] = useState<RecurringSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"list" | "create">("list");

  useEffect(() => {
    if (!businessId) {
      setLoading(false);
      return;
    }

    const loadSchedules = async () => {
      try {
        setLoading(true);
        const data = await listRecurringSchedules(businessId);
        setSchedules(data);
      } catch (error) {
        console.error("Failed to load schedules:", error);
      } finally {
        setLoading(false);
      }
    };

    loadSchedules();
  }, [businessId]);

  const handleSuccess = () => {
    setActiveTab("list");
    listRecurringSchedules(businessId).then(setSchedules).catch(console.error);
  };

  if (!businessId) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-red-600">Business context required. Please access through the main app.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-8">
            <h1 className="text-3xl font-bold text-gray-900">Recurring Schedules</h1>
            <p className="mt-2 text-gray-600">
              Manage recurring invoice schedules for your business.
            </p>

            <div className="mt-8">
              <div className="flex gap-4 border-b">
                <button
                  onClick={() => setActiveTab("list")}
                  className={`px-4 py-2 font-medium border-b-2 transition ${
                    activeTab === "list"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Schedules ({schedules.length})
                </button>
                <button
                  onClick={() => setActiveTab("create")}
                  className={`px-4 py-2 font-medium border-b-2 transition ${
                    activeTab === "create"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Create New
                </button>
              </div>

              {activeTab === "list" && (
                <div className="mt-6">
                  {loading ? (
                    <p className="text-gray-500">Loading schedules...</p>
                  ) : schedules.length === 0 ? (
                    <p className="text-gray-500">No recurring schedules yet.</p>
                  ) : (
                    <RecurringScheduleList
                      businessId={businessId}
                      schedules={schedules}
                      onScheduleUpdated={() => listRecurringSchedules(businessId).then(setSchedules).catch(console.error)}
                    />
                  )}
                </div>
              )}

              {activeTab === "create" && (
                <div className="mt-6">
                  <CreateRecurringScheduleForm
                    businessId={businessId}
                    customers={customers}
                    invoices={invoices}
                    onSuccess={handleSuccess}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
