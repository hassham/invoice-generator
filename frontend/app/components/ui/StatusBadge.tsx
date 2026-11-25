import { cn } from "./cn";

/**
 * IG-327: invoice status indicator (docs/BRANDINGGUIDELINES.md section 5). Colour is never the only
 * signal: every badge carries its text label. Maps the app's status values onto the brand pairs.
 */
export type InvoiceStatusTone = "paid" | "pending" | "overdue" | "draft" | "sent" | "partial" | "neutral";

const tones: Record<InvoiceStatusTone, string> = {
  paid: "bg-status-paid-bg text-status-paid-fg",
  pending: "bg-status-pending-bg text-status-pending-fg",
  overdue: "bg-status-overdue-bg text-status-overdue-fg",
  draft: "bg-status-draft-bg text-status-draft-fg",
  sent: "bg-status-sent-bg text-status-sent-fg",
  partial: "bg-status-partial-bg text-status-partial-fg",
  neutral: "bg-canvas text-muted",
};

const labels: Record<InvoiceStatusTone, string> = {
  paid: "Paid",
  pending: "Pending",
  overdue: "Overdue",
  draft: "Draft",
  sent: "Sent",
  partial: "Partially paid",
  neutral: "Closed",
};

/** Maps the status values the API returns (e.g. "PartiallyPaid", "Cancelled") to a tone. */
export function toneForInvoiceStatus(status: string): InvoiceStatusTone {
  switch (status) {
    case "Paid":
      return "paid";
    case "Pending":
      return "pending";
    case "Overdue":
      return "overdue";
    case "Draft":
      return "draft";
    case "Sent":
    case "Accepted":
      return "sent";
    case "PartiallyPaid":
      return "partial";
    default:
      return "neutral";
  }
}

export function StatusBadge({ tone, label, className }: { tone: InvoiceStatusTone; label?: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 font-sans text-xs font-semibold",
        tones[tone],
        className,
      )}
    >
      {label ?? labels[tone]}
    </span>
  );
}
