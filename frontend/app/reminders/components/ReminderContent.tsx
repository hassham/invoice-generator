"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useWorkspaceBusiness } from "../../lib/useWorkspaceBusiness";
import { ReminderRuleList } from "./ReminderRuleList";
import { listReminderRules, initializeDefaultReminderRules, ReminderRule } from "../../lib/reminders";

export function ReminderContent() {
  const { businessId, error: businessError } = useWorkspaceBusiness();
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
    if (!businessId) return;
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
    if (!businessId) return;
    try {
      const data = await listReminderRules(businessId);
      setRules(data);
    } catch (err) {
      console.error("Failed to refresh rules:", err);
    }
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
          <div className="p-4 sm:p-7">
            <h1 className="workspace-heading">Payment Reminders</h1>
            <p className="mt-2 text-muted">
              Configure automatic payment reminder rules for your invoices.
            </p>

            {error && (
              <div className="mt-6 rounded-md bg-status-overdue-bg/55 p-4 text-sm text-status-overdue-fg">
                {error}
              </div>
            )}

            <div className="mt-8">
              {loading ? (
                <p role="status" className="workspace-state">Loading reminder rules...</p>
              ) : rules.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
                  <p className="text-muted mb-4">No reminder rules configured yet.</p>
                  <button
                    onClick={handleInitializeDefaults}
                    className="workspace-button-primary"
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
