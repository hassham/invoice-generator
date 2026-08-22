import { afterEach, describe, expect, it, vi } from "vitest";
import { resetAnalyticsSink, setAnalyticsSink, track } from "./track";
import type { AnalyticsSink } from "./types";

describe("track", () => {
  afterEach(() => {
    resetAnalyticsSink();
  });

  it("forwards the event to the active sink", () => {
    const sink: AnalyticsSink = { track: vi.fn() };
    setAnalyticsSink(sink);

    track({ name: "invoice_editor_start", properties: { entryPoint: "hero" } });

    expect(sink.track).toHaveBeenCalledWith({
      name: "invoice_editor_start",
      properties: { entryPoint: "hero" },
    });
  });

  it("does not throw when the sink throws, so a failure never blocks the caller (IG-90)", () => {
    setAnalyticsSink({
      track: () => {
        throw new Error("network down");
      },
    });

    expect(() =>
      track({ name: "invoice_editor_start", properties: { entryPoint: "pricing_free_plan" } }),
    ).not.toThrow();
  });

  it("falls back to the default sink after resetAnalyticsSink", () => {
    const sink: AnalyticsSink = { track: vi.fn() };
    setAnalyticsSink(sink);
    resetAnalyticsSink();

    track({ name: "invoice_editor_start", properties: { entryPoint: "hero" } });

    expect(sink.track).not.toHaveBeenCalled();
  });
});
