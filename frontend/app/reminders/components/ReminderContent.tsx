"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ReminderRuleList } from "./ReminderRuleList";
import { listReminderRules, initializeDefaultReminderRules, ReminderRule } from "../../lib/reminders";

export function ReminderContent() {
  const searchParams = useSearchParams();
  const businessId = searchParams.get("businessId") || "";
  const [rules, setRules] = useState<ReminderRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!businessId) return;

    const loadRules = async () => {
      try {
        setLoading(true);
        const data = await listReminderRules(businessId);
        setRules(data);
      } catch (err) {
        console.error("Failed to load rules:", err);
        setError(err instanceof Error ? err.message : "Failed to load reminder rules");
      } finally {
        setLoading(false);
      }
    };

    loadRules();
  }, [businessId]);

  const handleInitializeDefaults = async () => {
    try {
      setLoading(true);
      const data = await initializeDefaultReminderRules(businessId);
      setRules(data);
      setInitialized(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to initialize default rules");
    } finally {
      setLoading(false);
    }
  };

  const handleRulesUpdated = async () => {
    try {
      const data = await listReminderRules(businessId);
      setRules(data);
    } catch (err) {
      console.error("Failed to refresh rules:", err);
    }
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
            <h1 className="text-3xl font-bold text-gray-900">Payment Reminders</h1>
            <p className="mt-2 text-gray-600">
              Configure automatic payment reminder rules for your invoices.
            </p>

            {error && (
              <div className="mt-6 rounded-md bg-red-50 p-4 text-sm text-red-800">
                {error}
              </div>
            )}

            <div className="mt-8">
              {loading ? (
                <p className="text-gray-500">Loading reminder rules...</p>
              ) : rules.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                  <p className="text-gray-500 mb-4">No reminder rules configured yet.</p>
                  <button
                    onClick={handleInitializeDefaults}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    Initialize Default Rules
                  </button>
                </div>
              ) : (
                <ReminderRuleList
                  businessId={businessId}
                  rules={rules}
                  onRulesUpdated={handleRulesUpdated}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
