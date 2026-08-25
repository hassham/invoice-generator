import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { EditorModeTabs } from "./EditorModeTabs";

function StatefulEditorModeTabs() {
  const [advancedVisible, setAdvancedVisible] = useState(false);
  return <EditorModeTabs advancedVisible={advancedVisible} onChange={setAdvancedVisible} />;
}

describe("EditorModeTabs", () => {
  it("defaults to Basic pressed, Advanced not pressed", () => {
    render(<StatefulEditorModeTabs />);

    expect(screen.getByRole("button", { name: "Basic" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Advanced" })).toHaveAttribute("aria-pressed", "false");
  });

  it("clicking Advanced calls onChange(true) and flips aria-pressed", async () => {
    const user = userEvent.setup();
    render(<StatefulEditorModeTabs />);

    await user.click(screen.getByRole("button", { name: "Advanced" }));

    expect(screen.getByRole("button", { name: "Advanced" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Basic" })).toHaveAttribute("aria-pressed", "false");
  });

  it("clicking Basic again calls onChange(false) and flips aria-pressed back", async () => {
    const user = userEvent.setup();
    render(<StatefulEditorModeTabs />);

    await user.click(screen.getByRole("button", { name: "Advanced" }));
    await user.click(screen.getByRole("button", { name: "Basic" }));

    expect(screen.getByRole("button", { name: "Basic" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Advanced" })).toHaveAttribute("aria-pressed", "false");
  });
});
