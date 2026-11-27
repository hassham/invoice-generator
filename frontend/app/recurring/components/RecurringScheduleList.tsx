"use client";

import { useState } from "react";
import {
  RecurringSchedule,
  pauseRecurringSchedule,
  resumeRecurringSchedule,
  cancelRecurringSchedule,
} from "../../lib/recurring";

interface RecurringScheduleListProps {
  businessId: string;
  schedules: RecurringSchedule[];
  onScheduleUpdated: () => void;
}

export function RecurringScheduleList({
  businessId,
  schedules,
  onScheduleUpdated,
}: RecurringScheduleListProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handlePause = async (scheduleId: string) => {
    try {
      setActionLoading(scheduleId);
      setError(null);
      await pauseRecurringSchedule(businessId, scheduleId);
      onScheduleUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to pause schedule");
    } finally {
      setActionLoading(null);
    }
  };

  const handleResume = async (scheduleId: string) => {
    try {
      setActionLoading(scheduleId);
      setError(null);
      await resumeRecurringSchedule(businessId, scheduleId);
      onScheduleUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resume schedule");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (scheduleId: string) => {
    try {
      setActionLoading(scheduleId);
      setError(null);
      await cancelRecurringSchedule(businessId, scheduleId);
      setConfirmDelete(null);
      onScheduleUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel schedule");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <>
      {error && (
        <div className="rounded-md bg-status-overdue-bg/55 p-4 text-sm text-status-overdue-fg mb-4">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {schedules.map((schedule) => (
          <div
            key={schedule.id}
            className="border border-border rounded-lg p-4 hover:border-border"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <h3 className="font-medium text-ink">
                  Schedule #{schedule.id.slice(0, 8)}
                </h3>
                <p className="text-sm text-muted mt-1">
                  Customer: {schedule.customerId.slice(0, 8)} · Frequency: {schedule.frequency}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    schedule.isActive
                      ? "bg-status-paid-bg text-status-paid-fg"
                      : "bg-status-draft-bg text-ink"
                  }`}
                >
                  {schedule.isActive ? "Active" : "Paused"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
              <div>
                <p className="text-muted">Start Date</p>
                <p className="text-ink">{schedule.startDate}</p>
              </div>
              <div>
                <p className="text-muted">End Date</p>
                <p className="text-ink">{schedule.endDate || "None"}</p>
              </div>
              <div>
                <p className="text-muted">Next Run</p>
                <p className="text-ink">{schedule.nextRunDate}</p>
              </div>
              <div>
                <p className="text-muted">Auto Send</p>
                <p className="text-ink">{schedule.autoSend ? "Enabled" : "Disabled"}</p>
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t">
              {schedule.isActive ? (
                <button
                  onClick={() => handlePause(schedule.id)}
                  disabled={actionLoading === schedule.id}
                  className="flex-1 px-3 py-2 text-sm font-medium text-status-pending-fg bg-status-pending-bg/60 border border-status-pending-fg/25 rounded-md hover:bg-status-pending-bg disabled:opacity-50"
                >
                  {actionLoading === schedule.id ? "Pausing..." : "Pause"}
                </button>
              ) : (
                <button
                  onClick={() => handleResume(schedule.id)}
                  disabled={actionLoading === schedule.id}
                  className="flex-1 px-3 py-2 text-sm font-medium text-status-paid-fg bg-status-paid-bg/65 border border-status-paid-fg/25 rounded-md hover:bg-status-paid-bg disabled:opacity-50"
                >
                  {actionLoading === schedule.id ? "Resuming..." : "Resume"}
                </button>
              )}

              <div className="relative">
                <button
                  onClick={() =>
                    setConfirmDelete(confirmDelete === schedule.id ? null : schedule.id)
                  }
                  className="px-3 py-2 text-sm font-medium text-status-overdue-fg bg-status-overdue-bg/55 border border-status-overdue-fg/25 rounded-md hover:bg-status-overdue-bg"
                >
                  Cancel
                </button>

                {confirmDelete === schedule.id && (
                  <div className="absolute right-0 top-full mt-1 bg-paper border border-border rounded-lg shadow-lg p-3 z-10 w-48">
                    <p className="text-sm text-ink font-medium mb-2">
                      Cancel this schedule permanently?
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleCancel(schedule.id)}
                        disabled={actionLoading === schedule.id}
                        className="flex-1 px-2 py-1 text-xs font-medium bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                      >
                        {actionLoading === schedule.id ? "Cancelling..." : "Cancel"}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="flex-1 px-2 py-1 text-xs font-medium text-ink bg-status-draft-bg rounded hover:bg-status-draft-bg"
                      >
                        Keep
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
