export interface TemplateStyle {
  headerBarClassName: string;
  accentTextClassName: string;
}

/**
 * IG-39: light-touch visual identity per launch template, reusing the same 3-variant look already
 * proven on the marketing page (app/components/landing/TemplatePreviewSection.tsx's InvoiceMockup)
 * rather than inventing a new palette. Full user-driven color/font/logo customisation on top of
 * whichever template is chosen is IG-40's job, not this one's - this only distinguishes the 3
 * templates from each other well enough that picking one visibly does something.
 */
const TEMPLATE_STYLES: Record<string, TemplateStyle> = {
  classic: { headerBarClassName: "bg-slate-900", accentTextClassName: "text-slate-950" },
  modern: { headerBarClassName: "bg-blue-600", accentTextClassName: "text-blue-700" },
  minimal: { headerBarClassName: "bg-white border-b border-slate-200", accentTextClassName: "text-slate-950" },
};

const DEFAULT_TEMPLATE_CODE = "classic";

/**
 * Falls back to Classic's styling for an empty or unrecognized code - covers the brief window
 * before the template fetch resolves (draft.templateId starts as "") and any retired/unknown
 * template code, rather than requiring every caller to null-check.
 */
export function getTemplateStyle(templateCode: string): TemplateStyle {
  return TEMPLATE_STYLES[templateCode] ?? TEMPLATE_STYLES[DEFAULT_TEMPLATE_CODE];
}
