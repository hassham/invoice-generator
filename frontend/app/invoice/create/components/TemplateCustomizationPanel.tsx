import { useId } from "react";
import { FONT_OPTIONS, HEADER_STYLE_OPTIONS, type HeaderStyle, type TemplateCustomization } from "../lib/templateCustomization";

interface TemplateCustomizationPanelProps {
  customization: TemplateCustomization;
  onChange: (next: TemplateCustomization) => void;
}

/**
 * FSD section 34 (Template Customisation): Primary colour, Accent colour, Font, Header style -
 * Logo is deliberately excluded (see lib/templateCustomization.ts's doc comment / IG-40's Jira
 * comment - it's IG-42's job, not this Story's). Native color inputs and fixed-option selects
 * can't produce an invalid value, so there's no error state to render here.
 */
export function TemplateCustomizationPanel({ customization, onChange }: TemplateCustomizationPanelProps) {
  const primaryColorId = useId();
  const accentColorId = useId();
  const fontId = useId();
  const headerStyleId = useId();

  return (
    <fieldset className="mt-6 border-t border-slate-200 pt-6">
      <legend className="text-base font-semibold text-slate-950">Appearance</legend>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="flex flex-col gap-1">
          <label htmlFor={primaryColorId} className="text-sm font-medium text-slate-700">
            Primary Color
          </label>
          <input
            id={primaryColorId}
            type="color"
            value={customization.primaryColor}
            onChange={(event) => onChange({ ...customization, primaryColor: event.target.value })}
            className="h-9 w-full rounded-md border border-slate-300"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={accentColorId} className="text-sm font-medium text-slate-700">
            Accent Color
          </label>
          <input
            id={accentColorId}
            type="color"
            value={customization.accentColor}
            onChange={(event) => onChange({ ...customization, accentColor: event.target.value })}
            className="h-9 w-full rounded-md border border-slate-300"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={fontId} className="text-sm font-medium text-slate-700">
            Font
          </label>
          <select
            id={fontId}
            value={customization.font}
            onChange={(event) => onChange({ ...customization, font: event.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950"
          >
            {FONT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={headerStyleId} className="text-sm font-medium text-slate-700">
            Header Style
          </label>
          <select
            id={headerStyleId}
            value={customization.headerStyle}
            onChange={(event) => onChange({ ...customization, headerStyle: event.target.value as HeaderStyle })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950"
          >
            {HEADER_STYLE_OPTIONS.map((style) => (
              <option key={style} value={style}>
                {style}
              </option>
            ))}
          </select>
        </div>
      </div>
    </fieldset>
  );
}
