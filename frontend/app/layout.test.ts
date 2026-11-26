import { describe, expect, it, vi } from "vitest";
import { metadata } from "./layout";

// Next transforms font loaders at build time; Vitest imports the module as-is.
vi.mock("next/font/google", () => ({
  Space_Grotesk: () => ({ variable: "space-grotesk" }),
  DM_Sans: () => ({ variable: "dm-sans" }),
  Space_Mono: () => ({ variable: "space-mono" }),
}));

describe("Root layout metadata", () => {
  it("sets a metadataBase so relative canonical/Open Graph URLs resolve correctly", () => {
    expect(metadata.metadataBase).toBeInstanceOf(URL);
  });

  it("provides a default title and a template for pages that set their own", () => {
    expect(metadata.title).toEqual(
      expect.objectContaining({
        default: expect.any(String),
        template: expect.stringContaining("%s"),
      }),
    );
  });

  it("allows public pages to be indexed", () => {
    expect(metadata.robots).toEqual(expect.objectContaining({ index: true, follow: true }));
  });
});
