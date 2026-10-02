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
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-800 mb-4">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className="border border-gray-200 rounded-lg p-4 hover:border-gray-300"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">
                  {TRIGGER_TYPE_LABELS[rule.triggerType] || rule.triggerType}
                  {rule.triggerType === "DaysOverdue" && ` - ${rule.triggerValue} days`}
                  {rule.triggerType === "BeforeDue" && ` - ${rule.triggerValue} days`}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    rule.isActive
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {rule.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>

            {editingId === rule.id ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                  <label
                    htmlFor={`active-${rule.id}`}
                    className="text-sm text-gray-700"
                  >
                    Active
                  </label>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => handleSave(rule)}
                    disabled={loading}
                    className="flex-1 px-3 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={handleCancel}
                    className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-3 text-sm text-gray-600">
                  <p className="font-medium">Subject:</p>
                  <p className="text-gray-900">{rule.emailSubject}</p>
                </div>

                <div className="mb-3 text-sm text-gray-600">
                  <p className="font-medium">Body:</p>
                  <p className="text-gray-900 whitespace-pre-wrap">{rule.emailBody}</p>
                </div>

                <div className="pt-3 border-t">
                  <button
                    onClick={() => handleEdit(rule)}
                    className="px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100"
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
