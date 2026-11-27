"use client";

import { useState } from "react";
import { ReminderRule, updateReminderRule } from "../../lib/reminders";

interface ReminderRuleListProps {
  businessId: string;
  rules: ReminderRule[];
  onRulesUpdated: () => void;
}

const TRIGGER_TYPE_LABELS: Record<string, string> = {
  BeforeDue: "Before Due Date",
  OnDue: "On Due Date",
  DaysOverdue: "Days Overdue",
};

export function ReminderRuleList({
  businessId,
  rules,
  onRulesUpdated,
}: ReminderRuleListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEdit = (rule: ReminderRule) => {
    setEditingId(rule.id);
    setEditingData({
      [rule.id]: {
        emailSubject: rule.emailSubject,
        emailBody: rule.emailBody,
        isActive: rule.isActive,
      },
    });
  };

  const handleSave = async (rule: ReminderRule) => {
    try {
      setLoading(true);
      setError(null);
      const data = editingData[rule.id];
      await updateReminderRule(businessId, rule.id, data);
      setEditingId(null);
      onRulesUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update rule");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditingData({});
  };

  return (
    <>
      {error && (
        <div className="rounded-md bg-status-overdue-bg/55 p-4 text-sm text-status-overdue-fg mb-4">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className="border border-border rounded-lg p-4 hover:border-border"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <h3 className="font-medium text-ink">
                  {TRIGGER_TYPE_LABELS[rule.triggerType] || rule.triggerType}
                  {rule.triggerType === "DaysOverdue" && ` - ${rule.triggerValue} days`}
                  {rule.triggerType === "BeforeDue" && ` - ${rule.triggerValue} days`}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    rule.isActive
                      ? "bg-status-paid-bg text-status-paid-fg"
                      : "bg-status-draft-bg text-ink"
                  }`}
                >
                  {rule.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>

            {editingId === rule.id ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">
                    Email Subject
                  </label>
                  <input
                    type="text"
                    value={editingData[rule.id]?.emailSubject || ""}
                    onChange={(e) =>
                      setEditingData({
                        ...editingData,
                        [rule.id]: {
                          ...editingData[rule.id],
                          emailSubject: e.target.value,
                        },
                      })
                    }
                    className="workspace-field w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ink"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink mb-1">
                    Email Body
                  </label>
                  <textarea
                    value={editingData[rule.id]?.emailBody || ""}
                    onChange={(e) =>
                      setEditingData({
                        ...editingData,
                        [rule.id]: {
                          ...editingData[rule.id],
                          emailBody: e.target.value,
                        },
                      })
                    }
                    rows={4}
                    className="workspace-field w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ink"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`active-${rule.id}`}
                    checked={editingData[rule.id]?.isActive || false}
                    onChange={(e) =>
                      setEditingData({
                        ...editingData,
                        [rule.id]: {
                          ...editingData[rule.id],
                          isActive: e.target.checked,
                        },
                      })
                    }
                    className="workspace-field h-4 w-4 text-ink border-border rounded"
                  />
                  <label
                    htmlFor={`active-${rule.id}`}
                    className="text-sm text-ink"
                  >
                    Active
                  </label>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => handleSave(rule)}
                    disabled={loading}
                    className="workspace-button-primary flex-1 disabled:opacity-50"
                  >
                    {loading ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={handleCancel}
                    className="flex-1 px-3 py-2 text-sm font-medium text-ink bg-status-draft-bg rounded-md hover:bg-status-draft-bg"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-3 text-sm text-muted">
                  <p className="font-medium">Subject:</p>
                  <p className="text-ink">{rule.emailSubject}</p>
                </div>

                <div className="mb-3 text-sm text-muted">
                  <p className="font-medium">Body:</p>
                  <p className="text-ink whitespace-pre-wrap">{rule.emailBody}</p>
                </div>

                <div className="pt-3 border-t">
                  <button
                    onClick={() => handleEdit(rule)}
                    className="px-3 py-2 text-sm font-medium text-status-sent-fg bg-status-sent-bg/55 border border-status-sent-fg/25 rounded-md hover:bg-status-sent-bg"
                  >
                    Edit
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
