"use client";

import { useEffect, useState } from "react";
import { getInvoiceEmailHistory, type InvoiceEmailLog } from "../../../../lib/invoiceEmail";

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString();
}

interface InvoiceEmailHistorySectionProps {
  invoiceId: string;
}

/**
 * IG-213 / docs/PRD.md section 11: "Email history should record: Sent timestamp, Recipient,
 * Delivery status." Opened-status tracking is deliberately out of scope for this pass (see the
 * Jira comment on IG-213) - no column for it exists to render here.
 */
export function InvoiceEmailHistorySection({ invoiceId }: InvoiceEmailHistorySectionProps) {
  const [history, setHistory] = useState<InvoiceEmailLog[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getInvoiceEmailHistory(invoiceId)
      .then((loaded) => {
        if (!cancelled) {
          setHistory(loaded);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Failed to load the email history for this invoice.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [invoiceId]);

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
        <p className="mt-4 text-sm text-slate-600">This invoice hasn&apos;t been emailed yet.</p>
      )}
    </fieldset>
  );
}
