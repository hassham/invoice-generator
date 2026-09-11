"use client";

import { useEffect, useRef } from "react";
import { InvoicePreview } from "../../invoice/create/components/InvoicePreview";
import type { Template } from "../../invoice/create/lib/templates";
import { buildSamplePreviewProps } from "../lib/samplePreview";

interface TemplatePreviewModalProps {
  template: Template;
  onClose: () => void;
}

/**
 * IG-204: mirrors AccountGateModal/ConfirmDialog's established overlay/focus/Escape pattern rather
 * than introducing a different one - see those components for why (IG-69's focus trap).
 */
export function TemplatePreviewModal({ template, onClose }: TemplatePreviewModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key === "Tab") {
        const dialog = dialogRef.current;
        if (!dialog) {
          return;
        }
        const focusable = dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) {
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const previewProps = buildSamplePreviewProps(template.templateCode);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4">
      <button type="button" aria-label="Close" onClick={onClose} className="fixed inset-0 cursor-default" tabIndex={-1} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="template-preview-heading"
        tabIndex={-1}
        className="relative w-full max-w-xl rounded-lg bg-white p-6 shadow-xl outline-none"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="template-preview-heading" className="text-lg font-bold text-slate-950">
            {template.name}
          </h2>
          <button type="button" onClick={onClose} className="text-sm font-medium text-slate-600 hover:text-slate-950">
            Close
          </button>
        </div>
        <InvoicePreview {...previewProps} />
      </div>
    </div>
  );
}
