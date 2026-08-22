import { describe, expect, it } from "vitest";
import { metadata } from "./page";

describe("Landing page metadata", () => {
  it("exposes a title and description for indexing", () => {
    expect(metadata.title).toBeTruthy();
    expect(metadata.description).toBeTruthy();
  });

  it("exposes a canonical URL", () => {
    expect(metadata.alternates?.canonical).toBe("/");
  });

  it("exposes Open Graph metadata matching the page title and description", () => {
    expect(metadata.openGraph?.title).toBe(metadata.title);
    expect(metadata.openGraph?.description).toBe(metadata.description);
    expect(metadata.openGraph?.url).toBe("/");
  });
});
