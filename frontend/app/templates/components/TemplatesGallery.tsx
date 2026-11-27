"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchTemplates, type Template } from "../../invoice/create/lib/templates";
import { DocumentThumbnail } from "../../invoice/create/components/DocumentThumbnail";
import { describeDocumentLayout } from "../../invoice/create/lib/documentLayouts";
import { TemplatePreviewModal } from "./TemplatePreviewModal";

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
    return <p className="mt-8 text-sm text-muted">Loading templates…</p>;
  }

  if (error) {
    return (
      <p role="alert" className="mt-8 text-sm text-status-overdue-fg">
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
            <DocumentThumbnail templateCode={template.templateCode} />
            <div className="mt-4 flex items-center gap-2">
              <h2 className="text-base font-semibold text-ink">{template.name}</h2>
              <span
                className={
                  template.isPremium
                    ? "rounded-full bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white"
                    : "rounded-full bg-status-draft-bg px-2 py-0.5 text-xs font-semibold text-muted"
                }
              >
                {template.isPremium ? "Pro" : "Free"}
              </span>
            </div>

            {describeDocumentLayout(template.templateCode) && (
              <p className="mt-1 text-sm text-muted">{describeDocumentLayout(template.templateCode)}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setPreviewTemplate(template)}
                className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-canvas"
              >
                Preview
              </button>
              {template.isPremium ? (
                <button
                  type="button"
                  onClick={() => setBlockedTemplateId(template.id)}
                  className="workspace-button-primary opacity-50"
                >
                  Use Template
                </button>
              ) : (
                <Link
                  href={`/invoice/create?template=${encodeURIComponent(template.templateCode)}`}
                  className="workspace-button-primary"
                >
                  Use Template
                </Link>
              )}
            </div>

            {blockedTemplateId === template.id ? (
              <p role="alert" className="mt-2 text-sm text-ink">
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
