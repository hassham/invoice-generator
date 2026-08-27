"use client";

import { useState, type KeyboardEvent, type ReactNode } from "react";

type EditorTab = "edit" | "preview";

interface InvoiceEditorLayoutProps {
  editor: ReactNode;
  preview: ReactNode;
  editorLabel?: string;
  previewLabel?: string;
}

const TABS: EditorTab[] = ["edit", "preview"];

function tabId(tab: EditorTab) {
  return `invoice-editor-tab-${tab}`;
}

function panelId(tab: EditorTab) {
  return `invoice-editor-panel-${tab}`;
}

/**
 * FSD section 11: desktop shows both panels side by side (55% editor / 45% preview); mobile
 * shows one at a time behind Edit/Preview tabs. Both panels stay mounted at all times regardless
 * of which is visible - only CSS display toggles - so whatever state a future invoice form holds
 * (S22-S26) survives a tab switch or a desktop/mobile resize by construction, rather than relying
 * on each field to persist itself.
 */
export function InvoiceEditorLayout({
  editor,
  preview,
  editorLabel = "Edit",
  previewLabel = "Preview",
}: InvoiceEditorLayoutProps) {
  const [activeTab, setActiveTab] = useState<EditorTab>("edit");
  const labels: Record<EditorTab, string> = { edit: editorLabel, preview: previewLabel };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, tab: EditorTab) => {
    // WAI-ARIA APG Tabs pattern: arrow keys move both focus and selection between tabs.
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }

    event.preventDefault();
    const currentIndex = TABS.indexOf(tab);
    const nextIndex =
      event.key === "ArrowRight"
        ? (currentIndex + 1) % TABS.length
        : (currentIndex - 1 + TABS.length) % TABS.length;
    const nextTab = TABS[nextIndex];

    setActiveTab(nextTab);
    document.getElementById(tabId(nextTab))?.focus();
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 print:max-w-none print:p-0">
      <div role="tablist" aria-label="Invoice editor mode" className="mb-4 flex gap-2 md:hidden print:hidden">
        {TABS.map((tab) => {
          const selected = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              role="tab"
              id={tabId(tab)}
              aria-selected={selected}
              aria-controls={panelId(tab)}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActiveTab(tab)}
              onKeyDown={(event) => handleTabKeyDown(event, tab)}
              className={
                selected
                  ? "rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
                  : "rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              }
            >
              {labels[tab]}
            </button>
          );
        })}
      </div>

      <div className="md:grid md:grid-cols-[55%_45%] md:gap-6 print:block">
        {TABS.map((tab) => (
          <div
            key={tab}
            id={panelId(tab)}
            role="tabpanel"
            aria-labelledby={tabId(tab)}
            className={
              tab === "edit"
                ? `${activeTab === tab ? "block" : "hidden md:block"} print:hidden`
                : activeTab === tab
                  ? "block"
                  : "hidden md:block"
            }
          >
            {tab === "edit" ? editor : preview}
          </div>
        ))}
      </div>
    </div>
  );
}
