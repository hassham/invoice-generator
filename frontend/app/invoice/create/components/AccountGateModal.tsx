"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { track } from "../../../../lib/analytics";

interface AccountGateModalProps {
  action: "download" | "print";
  onClose: () => void;
}

/**
 * IG-30 / FSD section 117: anonymous users can build and preview an invoice freely, but Download
 * PDF and Print are gated behind an account. The message is FSD section 117's exact copy (used
 * verbatim for both actions - the FSD presents one combined message for "Download PDF or Print",
 * not two variants), not a paraphrase. Preserving the current invoice data/template and
 * auto-resuming the pending action after sign-in is IG-31/IG-32's job, not this one - this
 * component only blocks and explains.
 */
export function AccountGateModal({ action, onClose }: AccountGateModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="fixed inset-0 cursor-default"
        tabIndex={-1}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-gate-heading"
        tabIndex={-1}
        className="relative w-full max-w-sm rounded-lg bg-white p-6 shadow-xl outline-none"
      >
        <h2 id="account-gate-heading" className="text-lg font-bold text-slate-950">
          Create a free account to download and securely save your invoice.
        </h2>
        <div className="mt-6 flex flex-col gap-3">
          <Link
            href="/signup"
            onClick={() => track({ name: "anonymous_gate_conversion", properties: { action, method: "signup" } })}
            className="rounded-full bg-slate-950 px-4 py-2 text-center text-sm font-semibold text-white transition-colors hover:bg-slate-800"
          >
            Sign up
          </Link>
          <Link
            href="/login"
            onClick={() => track({ name: "anonymous_gate_conversion", properties: { action, method: "login" } })}
            className="rounded-full border border-slate-300 px-4 py-2 text-center text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Log in
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="mt-1 text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
