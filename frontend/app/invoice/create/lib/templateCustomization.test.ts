import { describe, expect, it } from "vitest";
import { FONT_OPTIONS, getDefaultCustomization, sanitizeTemplateCustomization } from "./templateCustomization";

describe("getDefaultCustomization", () => {
  it("returns distinct default colors for each known template", () => {
    const classic = getDefaultCustomization("classic");
    const modern = getDefaultCustomization("modern");
    const minimal = getDefaultCustomization("minimal");

    expect(classic.primaryColor).not.toBe(modern.primaryColor);
    expect(modern.primaryColor).not.toBe(minimal.primaryColor);
  });

  it("falls back to Classic's colors for an unrecognized code", () => {
    expect(getDefaultCustomization("some-future-template")).toEqual(getDefaultCustomization("classic"));
  });

  it("defaults to the first font option and a Banner header style", () => {
    const customization = getDefaultCustomization("classic");
    expect(customization.font).toBe(FONT_OPTIONS[0].value);
    expect(customization.headerStyle).toBe("Banner");
  });
});

describe("sanitizeTemplateCustomization", () => {
  const valid = getDefaultCustomization("modern");

  it("passes through an already-valid customization unchanged", () => {
    expect(sanitizeTemplateCustomization(valid, "modern")).toEqual(valid);
  });

  it("substitutes the template default for an invalid primary color", () => {
    const result = sanitizeTemplateCustomization({ ...valid, primaryColor: "not-a-color" }, "modern");
    expect(result.primaryColor).toBe(getDefaultCustomization("modern").primaryColor);
  });

  it("substitutes the template default for an invalid accent color", () => {
    const result = sanitizeTemplateCustomization({ ...valid, accentColor: "#zzzzzz" }, "modern");
    expect(result.accentColor).toBe(getDefaultCustomization("modern").accentColor);
  });

  it("substitutes the template default for an unknown font", () => {
    const result = sanitizeTemplateCustomization({ ...valid, font: "Comic Sans MS" }, "modern");
    expect(result.font).toBe(getDefaultCustomization("modern").font);
  });

  it("substitutes the template default for an unknown header style", () => {
    const result = sanitizeTemplateCustomization({ ...valid, headerStyle: "Unknown" as never }, "modern");
    expect(result.headerStyle).toBe(getDefaultCustomization("modern").headerStyle);
  });
});
