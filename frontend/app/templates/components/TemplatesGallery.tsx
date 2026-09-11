"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchTemplates, type Template } from "../../invoice/create/lib/templates";
import { TemplatePreviewModal } from "./TemplatePreviewModal";

/** IG-204: same 3-variant mockup look already proven on the marketing page
 * (app/components/landing/TemplatePreviewSection.tsx) and the inline TemplateSelector
 * (app/invoice/create/components/TemplateSelector.tsx) - a larger variant of both, not a new
 * design, since this gallery's cards have more room than either of those. */
function TemplateMockup({ templateCode }: { templateCode: string }) {
  const headerClass =
    templateCode === "modern"
      ? "bg-blue-600"
      : templateCode === "minimal"
        ? "bg-white border-b border-slate-200"
        : "bg-slate-900";
  const headerBarClass = templateCode === "minimal" ? "bg-slate-300" : "bg-white/70";

  return (
    <div aria-hidden="true" className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className={`h-12 ${headerClass} flex items-center px-4`}>
        <div className={`h-2 w-16 rounded-full ${headerBarClass}`} />
      </div>
      <div className="space-y-2 p-4">
        <div className="h-2 w-3/4 rounded-full bg-slate-200" />
        <div className="h-2 w-1/2 rounded-full bg-slate-200" />
        <div className="mt-4 space-y-1.5">
          <div className="h-1.5 w-full rounded-full bg-slate-100" />
          <div className="h-1.5 w-full rounded-full bg-slate-100" />
          <div className="h-1.5 w-2/3 rounded-full bg-slate-100" />
        </div>
      </div>
    </div>
  );
}

/**
 * FSD section 73 (Templates Page): a standalone route for browsing templates - "Display card
 * grid," each card showing a preview / name / Free-Pro label, with Preview and Use Template
 * actions. Previously only documented in the FSD, never built (IG-204). No backend CRUD exists for
 * templates (global, GET-only catalogue - see lib/templates.ts), so "manage" here means browse +
 * preview + pick a starting point for a new invoice, not create/edit/delete.
 */
export function TemplatesGallery() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [blockedTemplateId, setBlockedTemplateId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchTemplates()
      .then((loaded) => {
        if (!cancelled) {
          setTemplates(loaded);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Failed to load templates.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <p className="mt-8 text-sm text-slate-500">Loading templates…</p>;
  }

  if (error) {
    return (
      <p role="alert" className="mt-8 text-sm text-red-600">
        {error}
      </p>
    );
  }

  const sorted = [...templates].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <>
      <ul className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((template) => (
          <li key={template.id}>
            <TemplateMockup templateCode={template.templateCode} />
            <div className="mt-4 flex items-center gap-2">
              <h2 className="text-base font-semibold text-slate-950">{template.name}</h2>
              <span
                className={
                  template.isPremium
                    ? "rounded-full bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white"
                    : "rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600"
                }
              >
                {template.isPremium ? "Pro" : "Free"}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setPreviewTemplate(template)}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                Preview
              </button>
              {template.isPremium ? (
                <button
                  type="button"
                  onClick={() => setBlockedTemplateId(template.id)}
                  className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white opacity-50"
                >
                  Use Template
                </button>
              ) : (
                <Link
                  href={`/invoice/create?template=${encodeURIComponent(template.templateCode)}`}
                  className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                >
                  Use Template
                </Link>
              )}
            </div>

            {blockedTemplateId === template.id ? (
              <p role="alert" className="mt-2 text-sm text-slate-700">
                Upgrade to Pro to use this template.
              </p>
            ) : null}
          </li>
        ))}
      </ul>

      {previewTemplate ? (
        <TemplatePreviewModal template={previewTemplate} onClose={() => setPreviewTemplate(null)} />
      ) : null}
    </>
  );
}
