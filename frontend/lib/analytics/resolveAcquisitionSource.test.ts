import { describe, expect, it } from "vitest";
import { resolveAcquisitionSource } from "./resolveAcquisitionSource";

describe("resolveAcquisitionSource", () => {
  it("prefers a valid utm_source over the referrer", () => {
    const params = new URLSearchParams("utm_source=Newsletter-2");
    expect(resolveAcquisitionSource("https://google.com/search", params, "example.com")).toEqual({
      type: "utm",
      value: "newsletter-2",
    });
  });

  it("ignores a malformed utm_source rather than passing arbitrary text through", () => {
    const params = new URLSearchParams({ utm_source: "not valid!! <script>" });
    const result = resolveAcquisitionSource("", params, "example.com");
    expect(result).not.toEqual(expect.objectContaining({ type: "utm" }));
  });

  it("resolves an empty referrer to direct", () => {
    expect(resolveAcquisitionSource("", new URLSearchParams(), "example.com")).toEqual({ type: "direct" });
  });

  it("resolves a same-origin referrer to direct, not referral", () => {
    const result = resolveAcquisitionSource("https://example.com/pricing", new URLSearchParams(), "example.com");
    expect(result).toEqual({ type: "direct" });
  });

  it("classifies known search engines by hostname", () => {
    expect(
      resolveAcquisitionSource("https://www.google.com/search?q=invoice+generator", new URLSearchParams(), "example.com"),
    ).toEqual({ type: "search", engine: "google" });
    expect(resolveAcquisitionSource("https://www.bing.com/search", new URLSearchParams(), "example.com")).toEqual({
      type: "search",
      engine: "bing",
    });
  });

  it("falls back to referral with only the hostname - never the full URL, path, or query string", () => {
    const referrer = "https://blog.example.org/2026/why-invoicing-matters?ref=twitter&user=jane@example.org";
    const result = resolveAcquisitionSource(referrer, new URLSearchParams(), "example.com");
    expect(result).toEqual({ type: "referral", host: "blog.example.org" });
    // Explicitly assert no leaked path/query/email survives into the resolved value.
    expect(JSON.stringify(result)).not.toContain("jane@example.org");
    expect(JSON.stringify(result)).not.toContain("why-invoicing-matters");
  });

  it("resolves an unparseable referrer to direct rather than throwing", () => {
    expect(resolveAcquisitionSource("not a url", new URLSearchParams(), "example.com")).toEqual({ type: "direct" });
  });
});
