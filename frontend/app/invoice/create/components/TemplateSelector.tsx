import { useState } from "react";
import type { Template } from "../lib/templates";

interface TemplateSelectorProps {
  templates: Template[];
  selectedTemplateId: string;
  loading: boolean;
  error: string | null;
  onSelect: (templateId: string) => void;
}

/**
 * FSD section 33 (Template Selection). Presentational only - CreateInvoiceEditor.tsx owns the
 * fetch, consistent with every other section keeping its data at the top level. Card visuals reuse
 * the same 3-variant mockup look already proven on the marketing page
 * (app/components/landing/TemplatePreviewSection.tsx), not a new design.
 *
 * FSD section 79 ("If Free user clicks Pro feature: Display upgrade modal"): no subscription
 * system exists yet (section 77 is explicitly "Future MVP+") and none of the launch templates are
 * currently marked premium, so this path is unreachable with live data today - but it's wired
 * correctly against `isPremium` so it's ready once that changes, rather than skipped.
 */
export function TemplateSelector({ templates, selectedTemplateId, loading, error, onSelect }: TemplateSelectorProps) {
  const [upgradeMessageFor, setUpgradeMessageFor] = useState<string | null>(null);

  const handleCardClick = (template: Template) => {
    if (template.isPremium) {
      setUpgradeMessageFor(template.id);
      return;
    }
    setUpgradeMessageFor(null);
    onSelect(template.id);
  };

  if (loading) {
    return <p className="text-sm text-slate-500">Loading templates…</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  return (
    <fieldset>
      <legend className="text-base font-semibold text-slate-950">Template</legend>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {templates.map((template) => {
          const selected = template.id === selectedTemplateId;
          return (
            <button
              key={template.id}
              type="button"
              aria-pressed={selected}
              onClick={() => handleCardClick(template)}
              className={
                selected
                  ? "rounded-lg border-2 border-blue-600 p-2 text-left"
                  : "rounded-lg border border-slate-200 p-2 text-left hover:border-slate-300"
              }
            >
              <TemplateMockup templateCode={template.templateCode} />
              <p className="mt-2 flex items-center gap-1 text-sm font-medium text-slate-950">
                {template.name}
                {template.isPremium ? (
                  <span className="rounded-full bg-slate-900 px-1.5 py-0.5 text-xs font-semibold text-white">Pro</span>
                ) : null}
              </p>
            </button>
          );
        })}
      </div>
      {upgradeMessageFor ? (
        <p role="alert" className="mt-3 text-sm text-slate-700">
          Upgrade to Pro to use this template.
        </p>
      ) : null}
    </fieldset>
  );
}

function TemplateMockup({ templateCode }: { templateCode: string }) {
  const headerClass =
    templateCode === "modern"
      ? "bg-blue-600"
      : templateCode === "minimal"
        ? "bg-white border-b border-slate-200"
        : "bg-slate-900";

  return (
    <div aria-hidden="true" className="overflow-hidden rounded-md border border-slate-200 bg-white">
      <div className={`h-4 ${headerClass}`} />
      <div className="space-y-1 p-2">
        <div className="h-1.5 w-3/4 rounded-full bg-slate-200" />
        <div className="h-1.5 w-1/2 rounded-full bg-slate-200" />
      </div>
    </div>
  );
}
