import { describe, expect, it } from "vitest";
import { createEmptyEditableEstimate } from "./estimate";
import { buildEstimatePdfPayloadFromEditable } from "./estimatePdf";

describe("buildEstimatePdfPayloadFromEditable", () => {
  it("sets documentTypeLabel to Estimate so the rendered PDF is distinguishable from an invoice", () => {
    const editable = { ...createEmptyEditableEstimate("AUD", "2026-09-01", "2026-09-15"), seller: "My Business", customer: "Acme Pty Ltd" };

    const payload = buildEstimatePdfPayloadFromEditable(editable, "classic");

    expect(payload.documentTypeLabel).toBe("Estimate");
    expect(payload.dueDate).toBe("2026-09-15");
    expect(payload.templateCode).toBe("classic");
  });
});
