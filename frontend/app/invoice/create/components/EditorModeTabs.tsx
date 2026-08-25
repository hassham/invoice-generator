interface EditorModeTabsProps {
  advancedVisible: boolean;
  onChange: (advancedVisible: boolean) => void;
}

/**
 * IG-193: Basic/Advanced switch for the invoice editor. Deliberately NOT modelled as ARIA tabs
 * (role="tablist"/"tab"/"tabpanel") like InvoiceEditorLayout's Edit/Preview switch - WAI-ARIA APG
 * tabs assume mutually-exclusive panels, but Advanced is additive (it reveals extra fields in
 * their natural document position - Due Date next to Issue Date, Ship To after Bill To - rather
 * than swapping to a wholly different view). A pressed-button pair is the correct semantics here.
 */
export function EditorModeTabs({ advancedVisible, onChange }: EditorModeTabsProps) {
  return (
    <div role="group" aria-label="Invoice form detail level" className="mb-4 flex gap-2">
      <button
        type="button"
        aria-pressed={!advancedVisible}
        onClick={() => onChange(false)}
        className={
          !advancedVisible
            ? "rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
            : "rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
        }
      >
        Basic
      </button>
      <button
        type="button"
        aria-pressed={advancedVisible}
        onClick={() => onChange(true)}
        className={
          advancedVisible
            ? "rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
            : "rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
        }
      >
        Advanced
      </button>
    </div>
  );
}
