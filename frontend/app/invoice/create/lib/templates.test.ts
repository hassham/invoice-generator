import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchTemplates } from "./templates";

describe("fetchTemplates", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the parsed template list on a successful response", async () => {
    const templates = [{ id: "1", name: "Classic", templateCode: "classic", previewImage: null, isPremium: false, sortOrder: 1 }];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(templates) }),
    );

    await expect(fetchTemplates()).resolves.toEqual(templates);
  });

  it("throws when the response is not ok", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve(null) }));

    await expect(fetchTemplates()).rejects.toThrow("Failed to load templates");
  });
});
