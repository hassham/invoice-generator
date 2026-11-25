import type { ReactNode } from "react";
import { cn } from "./cn";

/**
 * IG-327: a presentational toast for non-critical confirmations (section 18). Financial warnings and
 * errors should also appear inline next to the field or amount, not only as a toast.
 * `success` and `info` use role="status" (announced politely); `error` uses role="alert".
 */
export type ToastTone = "success" | "info" | "error";

const tones: Record<ToastTone, string> = {
  success: "bg-mint text-[#166534]",
  info: "bg-lavender text-[#563389]",
  error: "bg-pink text-[#991b1b]",
};

export function Toast({ tone = "info", children, className }: { tone?: ToastTone; children: ReactNode; className?: string }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-center gap-3 rounded-xl border border-ink px-4 py-3 font-sans text-sm font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </div>
  );
}
