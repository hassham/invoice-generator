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
    <fieldset className="mt-6 border-t border-border pt-6">
      <legend className="text-base font-semibold text-ink">Email History</legend>

      {loadError ? (
        <p role="alert" className="mt-4 rounded-md border border-status-overdue-fg/25 bg-status-overdue-bg/55 px-4 py-3 text-sm text-status-overdue-fg">
          {loadError}
        </p>
      ) : null}

      {history.length > 0 ? (
        <div className="mt-4 workspace-table-scroll">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted">
                <th className="py-2 pr-4 font-medium">Sent</th>
                <th className="py-2 pr-4 font-medium">Recipient</th>
                <th className="py-2 pr-4 font-medium">Subject</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 font-medium">Opened</th>
              </tr>
            </thead>
            <tbody>
              {history.map((entry) => (
                <tr key={entry.id} className="border-b border-border">
                  <td className="py-2 pr-4 text-ink">{formatDateTime(entry.sentAt)}</td>
                  <td className="py-2 pr-4 text-ink">{[...entry.to, ...entry.cc].join(", ")}</td>
                  <td className="py-2 pr-4 text-ink">{entry.subject}</td>
                  <td className="py-2 pr-4">
                    <span
                      className={
                        entry.status === "Sent"
                          ? "rounded-full bg-status-paid-bg px-3 py-1 text-xs font-semibold text-status-paid-fg"
                          : "rounded-full bg-status-overdue-bg px-3 py-1 text-xs font-semibold text-status-overdue-fg"
                      }
                    >
                      {entry.status}
                    </span>
                  </td>
                  <td className="py-2 pr-4">
                    {entry.status === "Sent" ? (
                      entry.openedAt ? (
                        <span className="text-ink">
                          {formatDateTime(entry.openedAt)}
                          {entry.openCount && entry.openCount > 1 ? ` (${entry.openCount} times)` : ""}
                        </span>
                      ) : (
                        <span className="text-muted">Not opened yet</span>
                      )
                    ) : (
                      <span className="text-muted">Not sent</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-muted">
            Opened is best effort: many email apps block images, so &quot;Not opened yet&quot; does not mean the email was not read.
          </p>
        </div>
      ) : loadError ? null : (
        <p className="mt-4 text-sm text-muted">This invoice hasn&apos;t been emailed yet.</p>
      )}
    </fieldset>
  );
}
