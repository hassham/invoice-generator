"use client";

import { useEffect, useState } from "react";
import { getEstimateEmailHistory, type EstimateEmailLog } from "../../../../lib/estimateEmail";

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString();
}

interface EstimateEmailHistorySectionProps {
  estimateId: string;
}

/** IG-221/262: mirrors InvoiceEmailHistorySection.tsx exactly. */
export function EstimateEmailHistorySection({ estimateId }: EstimateEmailHistorySectionProps) {
  const [history, setHistory] = useState<EstimateEmailLog[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getEstimateEmailHistory(estimateId)
      .then((loaded) => {
        if (!cancelled) {
          setHistory(loaded);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Failed to load the email history for this estimate.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [estimateId]);

  return (
    <fieldset className="mt-6 border-t border-slate-200 pt-6">
      <legend className="text-base font-semibold text-slate-950">Email History</legend>

      {loadError ? (
        <p role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </p>
      ) : null}

      {history.length > 0 ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600">
                <th className="py-2 pr-4 font-medium">Sent</th>
                <th className="py-2 pr-4 font-medium">Recipient</th>
                <th className="py-2 pr-4 font-medium">Subject</th>
                <th className="py-2 pr-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {history.map((entry) => (
                <tr key={entry.id} className="border-b border-slate-100">
                  <td className="py-2 pr-4 text-slate-950">{formatDateTime(entry.sentAt)}</td>
                  <td className="py-2 pr-4 text-slate-700">{[...entry.to, ...entry.cc].join(", ")}</td>
                  <td className="py-2 pr-4 text-slate-700">{entry.subject}</td>
                  <td className="py-2 pr-4">
                    <span
                      className={
                        entry.status === "Sent"
                          ? "rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700"
                          : "rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700"
                      }
                    >
                      {entry.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : loadError ? null : (
        <p className="mt-4 text-sm text-slate-600">This estimate hasn&apos;t been emailed yet.</p>
      )}
    </fieldset>
  );
}
