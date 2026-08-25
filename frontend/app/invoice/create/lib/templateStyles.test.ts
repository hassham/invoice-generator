import { describe, expect, it } from "vitest";
import { getTemplateStyle } from "./templateStyles";

describe("getTemplateStyle", () => {
  it("returns a distinct style for each known template code", () => {
    const classic = getTemplateStyle("classic");
    const modern = getTemplateStyle("modern");
    const minimal = getTemplateStyle("minimal");

    expect(classic.headerBarClassName).not.toBe(modern.headerBarClassName);
    expect(modern.headerBarClassName).not.toBe(minimal.headerBarClassName);
    expect(classic.headerBarClassName).not.toBe(minimal.headerBarClassName);
  });

  it("falls back to Classic's style for an unrecognized code", () => {
    expect(getTemplateStyle("some-future-template")).toEqual(getTemplateStyle("classic"));
  });

  it("falls back to Classic's style for an empty code (before the template fetch resolves)", () => {
    expect(getTemplateStyle("")).toEqual(getTemplateStyle("classic"));
  });
});
