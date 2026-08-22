import { describe, expect, it } from "vitest";
import { metadata } from "./layout";

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
