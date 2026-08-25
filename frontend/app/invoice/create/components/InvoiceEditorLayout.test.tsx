import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { InvoiceEditorLayout } from "./InvoiceEditorLayout";

/**
 * A stateful stand-in for a real invoice form field - lets tests prove that switching tabs
 * doesn't reset input, without depending on any real invoice field existing yet (those land in
 * later Stories).
 */
function ControlledField() {
  const [value, setValue] = useState("");
  return (
    <input aria-label="Sample field" value={value} onChange={(event) => setValue(event.target.value)} />
  );
}

function renderLayout() {
  return render(<InvoiceEditorLayout editor={<ControlledField />} preview={<p>Preview content</p>} />);
}

describe("InvoiceEditorLayout", () => {
  it("shows both panels via role=tabpanel, labelled by their tab", () => {
    renderLayout();

    expect(screen.getByRole("tabpanel", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("tabpanel", { name: "Preview" })).toBeInTheDocument();
  });

  it("starts on the Edit tab selected, Preview not selected", () => {
    renderLayout();

    expect(screen.getByRole("tab", { name: "Edit" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Preview" })).toHaveAttribute("aria-selected", "false");
  });

  it("both panels stay mounted regardless of the active tab - only visibility changes", () => {
    renderLayout();

    // The Preview tab isn't active yet, but its panel content must already be in the DOM (not
    // conditionally rendered) - this is the mechanism that guarantees state survives a switch.
    expect(screen.getByText("Preview content")).toBeInTheDocument();
    expect(screen.getByLabelText("Sample field")).toBeInTheDocument();
  });

  it("entered text in the editor panel survives switching to Preview and back", async () => {
    const user = userEvent.setup();
    renderLayout();

    await user.type(screen.getByLabelText("Sample field"), "hello");
    await user.click(screen.getByRole("tab", { name: "Preview" }));
    await user.click(screen.getByRole("tab", { name: "Edit" }));

    expect(screen.getByLabelText("Sample field")).toHaveValue("hello");
  });

  it("clicking a tab updates aria-selected on both tabs", async () => {
    const user = userEvent.setup();
    renderLayout();

    await user.click(screen.getByRole("tab", { name: "Preview" }));

    expect(screen.getByRole("tab", { name: "Preview" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Edit" })).toHaveAttribute("aria-selected", "false");
  });

  it("only the active tab is keyboard-focusable (roving tabindex)", async () => {
    const user = userEvent.setup();
    renderLayout();

    expect(screen.getByRole("tab", { name: "Edit" })).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("tab", { name: "Preview" })).toHaveAttribute("tabindex", "-1");

    await user.click(screen.getByRole("tab", { name: "Preview" }));

    expect(screen.getByRole("tab", { name: "Preview" })).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("tab", { name: "Edit" })).toHaveAttribute("tabindex", "-1");
  });

  it("ArrowRight/ArrowLeft move both focus and selection between tabs", async () => {
    const user = userEvent.setup();
    renderLayout();

    screen.getByRole("tab", { name: "Edit" }).focus();
    await user.keyboard("{ArrowRight}");

    expect(screen.getByRole("tab", { name: "Preview" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "Preview" })).toHaveAttribute("aria-selected", "true");

    await user.keyboard("{ArrowLeft}");

    expect(screen.getByRole("tab", { name: "Edit" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "Edit" })).toHaveAttribute("aria-selected", "true");
  });

  it("ArrowRight wraps from the last tab back to the first", async () => {
    const user = userEvent.setup();
    renderLayout();

    screen.getByRole("tab", { name: "Preview" }).focus();
    await user.keyboard("{ArrowRight}");

    expect(screen.getByRole("tab", { name: "Edit" })).toHaveFocus();
  });

  it("supports custom tab labels", () => {
    render(
      <InvoiceEditorLayout
        editor={<ControlledField />}
        preview={<p>Preview content</p>}
        editorLabel="Form"
        previewLabel="Result"
      />,
    );

    expect(screen.getByRole("tab", { name: "Form" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Result" })).toBeInTheDocument();
  });
});
