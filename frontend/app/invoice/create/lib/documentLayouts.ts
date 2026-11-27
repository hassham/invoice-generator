const DOCUMENT_LAYOUTS = {
  studio: { description: "Editorial heading and a soft colour panel" },
  ledger: { description: "Compact, ruled and easy to print" },
  horizon: { description: "Split header and a prominent total" },
} as const;

type DocumentLayout = keyof typeof DOCUMENT_LAYOUTS;

export function getDocumentLayout(code?: string): DocumentLayout | "legacy" {
  return code === "studio" || code === "ledger" || code === "horizon" ? code : "legacy";
}

export function describeDocumentLayout(code: string): string | undefined {
  const layout = getDocumentLayout(code);
  return layout === "legacy" ? undefined : DOCUMENT_LAYOUTS[layout].description;
}
