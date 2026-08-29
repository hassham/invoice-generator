const STORAGE_KEY = "invoiceGenerator.pendingGateAction.v1";

/**
 * Matches invoice/create/lib/draftStorage.ts's DRAFT_RETENTION_MS - a pending action is
 * meaningless without the invoice draft it belongs to, so it expires on the same schedule rather
 * than inventing a separate policy.
 */
const RETENTION_MS = 24 * 60 * 60 * 1000;

export type PendingGateAction = "download" | "print";

interface StoredPendingAction {
  action: PendingGateAction;
  savedAt: number;
}

function isValid(value: unknown): value is StoredPendingAction {
  return (
    typeof value === "object" &&
    value !== null &&
    ((value as StoredPendingAction).action === "download" || (value as StoredPendingAction).action === "print") &&
    typeof (value as StoredPendingAction).savedAt === "number"
  );
}

function readStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    // Safari private browsing (older versions) and similarly locked-down environments can throw
    // just from touching localStorage, not only from writing to it.
    return null;
  }
}

/**
 * IG-31 / FSD section 37: "the requested action" is preserved so it can survive the authentication
 * flow - called right when the account gate is shown (IG-30's AccountGateModal), not on the click
 * that would have performed the action, since the action never fires for an anonymous visitor.
 */
export function savePendingGateAction(action: PendingGateAction): void {
  const storage = readStorage();
  if (!storage) {
    return;
  }
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify({ action, savedAt: Date.now() } satisfies StoredPendingAction));
  } catch {
    // Quota exceeded or storage disabled - same as draftStorage.ts, not worth surfacing.
  }
}

/** Returns null for "nothing pending" - none saved, saved by an incompatible/corrupt shape, or past the retention window. */
export function loadPendingGateAction(): PendingGateAction | null {
  const storage = readStorage();
  if (!storage) {
    return null;
  }
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    storage.removeItem(STORAGE_KEY);
    return null;
  }
  if (!isValid(parsed) || Date.now() - parsed.savedAt > RETENTION_MS) {
    storage.removeItem(STORAGE_KEY);
    return null;
  }
  return parsed.action;
}

/**
 * FSD section 37: cleared once the data "has been successfully associated with the authenticated
 * account" - that requires an actual save, which doesn't exist yet (Epic IG-7), so the only caller
 * today is cancellation (IG-31 AC: "cancellation... without completing the gated action" - a
 * cancelled request shouldn't resurface and auto-complete later once IG-32 exists).
 */
export function clearPendingGateAction(): void {
  const storage = readStorage();
  if (!storage) {
    return;
  }
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // As above - failure to clear is not worth surfacing.
  }
}
