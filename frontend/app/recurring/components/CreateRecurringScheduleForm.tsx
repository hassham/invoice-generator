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

const FREQUENCIES = ["Weekly", "Fortnightly", "Monthly", "Quarterly", "Annually", "Custom"];

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
        <label htmlFor="customer" className="block text-sm font-medium text-gray-900">
          Customer *
        </label>
        <select
          id="customer"
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
        <label htmlFor="template" className="block text-sm font-medium text-gray-900">
          Invoice Template *
        </label>
        <select
          id="template"
          value={invoiceTemplateId}
          onChange={(e) => setInvoiceTemplateId(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
        <label htmlFor="frequency" className="block text-sm font-medium text-gray-900">
          Frequency *
        </label>
        <select
          id="frequency"
          value={frequency}
          onChange={(e) => setFrequency(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
          <label htmlFor="startDate" className="block text-sm font-medium text-gray-900">
            Start Date *
          </label>
          <input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label htmlFor="endDate" className="block text-sm font-medium text-gray-900">
            End Date (Optional)
          </label>
          <input
            id="endDate"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div className="flex items-center">
        <input
          id="autoSend"
          type="checkbox"
          checked={autoSend}
          onChange={(e) => setAutoSend(e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="autoSend" className="ml-2 block text-sm text-gray-900">
          Automatically send invoice when generated
        </label>
      </div>

      {error && <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">{error}</div>}

      {success && (
        <div className="rounded-md bg-green-50 p-4 text-sm text-green-800">
          Recurring schedule created successfully!
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:bg-gray-400"
      >
        {loading ? "Creating..." : "Create Recurring Schedule"}
      </button>
    </form>
  );
}
