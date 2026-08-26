export type HeaderStyle = "Banner" | "Bordered" | "Plain";

export interface TemplateCustomization {
  primaryColor: string;
  accentColor: string;
  font: string;
  headerStyle: HeaderStyle;
}

/** FSD section 34: no external font loading exists anywhere in this app - these are CSS-safe stacks, not web fonts. */
export const FONT_OPTIONS = [
  { value: "Arial, Helvetica, sans-serif", label: "Sans Serif" },
  { value: "Georgia, 'Times New Roman', serif", label: "Serif" },
  { value: "'Courier New', monospace", label: "Monospace" },
];

export const HEADER_STYLE_OPTIONS: HeaderStyle[] = ["Banner", "Bordered", "Plain"];

/** IG-39's 3-variant palette (lib/templateStyles.ts), re-expressed as hex values so it can drive inline styles instead of static Tailwind classes. */
const TEMPLATE_DEFAULT_COLORS: Record<string, { primaryColor: string; accentColor: string }> = {
  classic: { primaryColor: "#0f172a", accentColor: "#0f172a" },
  modern: { primaryColor: "#2563eb", accentColor: "#1d4ed8" },
  minimal: { primaryColor: "#ffffff", accentColor: "#0f172a" },
};

/** Falls back to Classic's colors for an empty or unrecognized template code, same convention as IG-39's getTemplateStyle. */
export function getDefaultCustomization(templateCode: string): TemplateCustomization {
  const colors = TEMPLATE_DEFAULT_COLORS[templateCode] ?? TEMPLATE_DEFAULT_COLORS.classic;
  return { ...colors, font: FONT_OPTIONS[0].value, headerStyle: "Banner" };
}

const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

/**
 * FSD section 34: "Invalid customisation values are rejected or normalized safely." The picker UI
 * (native color input, fixed-option selects) can't normally produce an invalid value itself, so
 * this exists to guard a future load-from-storage path (once IG-7 persistence lands) rather than
 * anything reachable through today's UI - any out-of-range field silently falls back to the
 * current template's own default instead of erroring.
 */
export function sanitizeTemplateCustomization(
  customization: TemplateCustomization,
  templateCode: string,
): TemplateCustomization {
  const fallback = getDefaultCustomization(templateCode);
  return {
    primaryColor: HEX_COLOR_PATTERN.test(customization.primaryColor) ? customization.primaryColor : fallback.primaryColor,
    accentColor: HEX_COLOR_PATTERN.test(customization.accentColor) ? customization.accentColor : fallback.accentColor,
    font: FONT_OPTIONS.some((option) => option.value === customization.font) ? customization.font : fallback.font,
    headerStyle: HEADER_STYLE_OPTIONS.includes(customization.headerStyle) ? customization.headerStyle : fallback.headerStyle,
  };
}
