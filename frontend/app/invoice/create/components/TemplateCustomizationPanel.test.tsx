import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FONT_OPTIONS, getDefaultCustomization } from "../lib/templateCustomization";
import { TemplateCustomizationPanel } from "./TemplateCustomizationPanel";

describe("TemplateCustomizationPanel", () => {
  it("renders both color inputs and both selects with the current values", () => {
    const customization = getDefaultCustomization("modern");
    render(<TemplateCustomizationPanel customization={customization} onChange={vi.fn()} />);

    expect(screen.getByLabelText("Primary Color")).toHaveValue(customization.primaryColor);
    expect(screen.getByLabelText("Accent Color")).toHaveValue(customization.accentColor);
    expect(screen.getByLabelText("Font")).toHaveValue(customization.font);
    expect(screen.getByLabelText("Header Style")).toHaveValue(customization.headerStyle);
  });

  it("changing the primary color calls onChange with only that field updated", () => {
    const onChange = vi.fn();
    const customization = getDefaultCustomization("classic");
    render(<TemplateCustomizationPanel customization={customization} onChange={onChange} />);

    // jsdom's <input type="color"> doesn't support real color-picker interaction, so fire the
    // change event directly with a new value instead of trying to simulate the native picker.
    fireEvent.change(screen.getByLabelText("Primary Color"), { target: { value: "#ff0000" } });

    expect(onChange).toHaveBeenCalledWith({ ...customization, primaryColor: "#ff0000" });
  });

  it("changing the font calls onChange with only that field updated", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const customization = getDefaultCustomization("classic");
    render(<TemplateCustomizationPanel customization={customization} onChange={onChange} />);

    await user.selectOptions(screen.getByLabelText("Font"), FONT_OPTIONS[1].value);

    expect(onChange).toHaveBeenCalledWith({ ...customization, font: FONT_OPTIONS[1].value });
  });

  it("changing the header style calls onChange with only that field updated", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const customization = getDefaultCustomization("classic");
    render(<TemplateCustomizationPanel customization={customization} onChange={onChange} />);

    await user.selectOptions(screen.getByLabelText("Header Style"), "Bordered");

    expect(onChange).toHaveBeenCalledWith({ ...customization, headerStyle: "Bordered" });
  });
});
