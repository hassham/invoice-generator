import styles from "./InvoiceCreation.module.css";

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
    <div role="group" aria-label="Invoice form detail level" className={styles.modeSwitch}>
      <button
        type="button"
        aria-pressed={!advancedVisible}
        onClick={() => onChange(false)}
        className={styles.modeButton}
      >
        Basic
      </button>
      <button
        type="button"
        aria-pressed={advancedVisible}
        onClick={() => onChange(true)}
        className={styles.modeButton}
      >
        Advanced
      </button>
    </div>
  );
}
