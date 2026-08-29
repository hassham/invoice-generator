import { afterEach, describe, expect, it, vi } from "vitest";
import { clearPendingGateAction, loadPendingGateAction, savePendingGateAction } from "./pendingGateAction";

const STORAGE_KEY = "invoiceGenerator.pendingGateAction.v1";
const RETENTION_MS = 24 * 60 * 60 * 1000;

afterEach(() => {
  localStorage.clear();
  vi.useRealTimers();
});

describe("loadPendingGateAction", () => {
  it("returns null when nothing has been saved", () => {
    expect(loadPendingGateAction()).toBeNull();
  });

  it("round-trips a saved action", () => {
    savePendingGateAction("download");
    expect(loadPendingGateAction()).toBe("download");
  });

  it("round-trips print as well as download", () => {
    savePendingGateAction("print");
    expect(loadPendingGateAction()).toBe("print");
  });

  it("returns null and clears storage for an entry past the retention window", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    savePendingGateAction("download");
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z").getTime() + RETENTION_MS + 1);

    expect(loadPendingGateAction()).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("still restores an entry saved just under the retention window", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    savePendingGateAction("print");
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z").getTime() + RETENTION_MS - 1);

    expect(loadPendingGateAction()).toBe("print");
  });

  it("returns null and clears storage for unparsable JSON", () => {
    localStorage.setItem(STORAGE_KEY, "{not json");
    expect(loadPendingGateAction()).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("returns null and clears storage for a structurally invalid entry - localStorage is untrusted input", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ action: "delete-everything", savedAt: Date.now() }));
    expect(loadPendingGateAction()).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});

describe("clearPendingGateAction", () => {
  it("removes a saved action so a later load finds nothing", () => {
    savePendingGateAction("download");
    clearPendingGateAction();
    expect(loadPendingGateAction()).toBeNull();
  });
});
