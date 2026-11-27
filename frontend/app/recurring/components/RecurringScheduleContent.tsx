"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useWorkspaceBusiness } from "../../lib/useWorkspaceBusiness";
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
  const { businessId, error: businessError } = useWorkspaceBusiness();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [schedules, setSchedules] = useState<RecurringSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"list" | "create">("list");

  useEffect(() => {
    if (!businessId) return;

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
    if (!businessId) return;
    setActiveTab("list");
    listRecurringSchedules(businessId).then(setSchedules).catch(console.error);
  };

  if (!businessId) {
    return (
      <div>
        <div className="min-w-0">
          <div className="workspace-panel p-6">
            {businessError ? (
              <p role="alert" className="workspace-state workspace-error">{businessError} <Link href="/businesses" className="font-semibold underline">Manage businesses</Link></p>
            ) : (
              <p role="status" className="text-sm text-muted">Loading your business…</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="min-w-0">
        <div className="workspace-panel">
          <header data-panel-heading>
            <h1 className="workspace-heading">Recurring Schedules</h1>
            <p className="mt-2 text-muted">
              Manage recurring invoice schedules for your business.
            </p>
          </header>
          <div className="p-4 sm:p-7">

            <div className="mt-8">
              <div className="flex flex-wrap gap-2 border-b border-border pb-3">
                <button
                  type="button"
                  aria-pressed={activeTab === "list"}
                  onClick={() => setActiveTab("list")}
                  className={`workspace-tab ${
                    activeTab === "list"
                      ? "workspace-tab-active"
                      : "workspace-tab-idle"
                  }`}
                >
                  Schedules ({schedules.length})
                </button>
                <button
                  type="button"
                  aria-pressed={activeTab === "create"}
                  onClick={() => setActiveTab("create")}
                  className={`workspace-tab ${
                    activeTab === "create"
                      ? "workspace-tab-active"
                      : "workspace-tab-idle"
                  }`}
                >
                  Create New
                </button>
              </div>

              {activeTab === "list" && (
                <div className="mt-6">
                  {loading ? (
                    <p role="status" className="workspace-state">Loading schedules...</p>
                  ) : schedules.length === 0 ? (
                    <p className="workspace-state">No recurring schedules yet.</p>
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
