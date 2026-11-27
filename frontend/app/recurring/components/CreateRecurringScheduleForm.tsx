"use client";

import { useState } from "react";
import { createRecurringSchedule, CreateRecurringScheduleRequest } from "../../lib/recurring";

interface Customer {
  id: string;
  name: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
}

interface CreateRecurringScheduleFormProps {
  businessId: string;
  customers: Customer[];
  invoices: Invoice[];
  onSuccess?: () => void;
}

// IG-325: "Custom" is not offered. The backend has no interval field and calculates Custom
// schedules as monthly (CalculateNextRunDate), so offering it would mislead users. The backend
// still accepts it for existing API clients and existing schedules.
const FREQUENCIES = ["Weekly", "Fortnightly", "Monthly", "Quarterly", "Annually"];

export function CreateRecurringScheduleForm({
  businessId,
  customers,
  invoices,
  onSuccess,
}: CreateRecurringScheduleFormProps) {
  const [customerId, setCustomerId] = useState<string>("");
  const [invoiceTemplateId, setInvoiceTemplateId] = useState<string>("");
  const [frequency, setFrequency] = useState<string>("Monthly");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [autoSend, setAutoSend] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!customerId || !invoiceTemplateId || !startDate) {
      setError("Please fill in all required fields.");
      return;
    }

    if (endDate && endDate <= startDate) {
      setError("End date must be after start date.");
      return;
    }

    try {
      setLoading(true);
      const request: CreateRecurringScheduleRequest = {
        customerId,
        invoiceTemplateId,
        frequency,
        startDate,
        endDate: endDate || undefined,
        autoSend,
      };

      await createRecurringSchedule(businessId, request);
      setSuccess(true);
      setCustomerId("");
      setInvoiceTemplateId("");
      setFrequency("Monthly");
      setStartDate("");
      setEndDate("");
      setAutoSend(false);

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create recurring schedule.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <div>
        <label htmlFor="customer" className="block text-sm font-medium text-ink">
          Customer *
        </label>
        <select
          id="customer"
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          className="workspace-field mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-ink focus:border-ink"
          required
        >
          <option value="">Select a customer</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="template" className="block text-sm font-medium text-ink">
          Invoice Template *
        </label>
        <select
          id="template"
          value={invoiceTemplateId}
          onChange={(e) => setInvoiceTemplateId(e.target.value)}
          className="workspace-field mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-ink focus:border-ink"
          required
        >
          <option value="">Select an invoice template</option>
          {invoices.map((inv) => (
            <option key={inv.id} value={inv.id}>
              {inv.invoiceNumber}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="frequency" className="block text-sm font-medium text-ink">
          Frequency *
        </label>
        <select
          id="frequency"
          value={frequency}
          onChange={(e) => setFrequency(e.target.value)}
          className="workspace-field mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-ink focus:border-ink"
        >
          {FREQUENCIES.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="startDate" className="block text-sm font-medium text-ink">
            Start Date *
          </label>
          <input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="workspace-field mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-ink focus:border-ink"
            required
          />
        </div>

        <div>
          <label htmlFor="endDate" className="block text-sm font-medium text-ink">
            End Date (Optional)
          </label>
          <input
            id="endDate"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="workspace-field mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-ink focus:border-ink"
          />
        </div>
      </div>

      <div className="flex items-center">
        <input
          id="autoSend"
          type="checkbox"
          checked={autoSend}
          onChange={(e) => setAutoSend(e.target.checked)}
          className="workspace-field h-4 w-4 text-ink focus:ring-ink border-border rounded"
        />
        <label htmlFor="autoSend" className="ml-2 block text-sm text-ink">
          Automatically send invoice when generated
        </label>
      </div>

      {error && <div className="rounded-md bg-status-overdue-bg/55 p-4 text-sm text-status-overdue-fg">{error}</div>}

      {success && (
        <div className="rounded-md bg-status-paid-bg/65 p-4 text-sm text-status-paid-fg">
          Recurring schedule created successfully!
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="workspace-button-primary w-full"
      >
        {loading ? "Creating..." : "Create Recurring Schedule"}
      </button>
    </form>
  );
}
