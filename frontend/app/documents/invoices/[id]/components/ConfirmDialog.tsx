"use client";

import { useEffect, useRef } from "react";

interface ConfirmDialogProps {
  title: string;
  body: string;
  confirmLabel: string;
  dismissLabel?: string;
  pending?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onDismiss: () => void;
}

/**
 * FSD section 52: "User confirms cancellation" - reused for Delete too (both are destructive,
 * one-way invoice actions). Mirrors AccountGateModal's established overlay/focus/Escape pattern
 * rather than introducing a different one.
 */
export function ConfirmDialog({ title, body, confirmLabel, dismissLabel = "Cancel", pending, error, onConfirm, onDismiss }: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onDismiss();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onDismiss]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <button type="button" aria-label="Close" onClick={onDismiss} className="fixed inset-0 cursor-default" tabIndex={-1} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-heading"
        tabIndex={-1}
        className="relative w-full max-w-sm rounded-lg bg-white p-6 shadow-xl outline-none"
      >
        <h2 id="confirm-dialog-heading" className="text-lg font-bold text-slate-950">
          {title}
        </h2>
        <p className="mt-2 text-sm text-slate-600">{body}</p>

        {error ? (
          <p role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onDismiss}
            disabled={pending}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {dismissLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {pending ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
