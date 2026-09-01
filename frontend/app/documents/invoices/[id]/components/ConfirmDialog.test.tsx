import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "./ConfirmDialog";

describe("ConfirmDialog", () => {
  it("renders the title, body and both action buttons", () => {
    render(<ConfirmDialog title="Cancel this invoice?" body="This cannot be undone." confirmLabel="Cancel Invoice" onConfirm={vi.fn()} onDismiss={vi.fn()} />);

    expect(screen.getByText("Cancel this invoice?")).toBeInTheDocument();
    expect(screen.getByText("This cannot be undone.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel Invoice" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("uses a custom dismiss label when given", () => {
    render(<ConfirmDialog title="Cancel this invoice?" body="Body" confirmLabel="Cancel Invoice" dismissLabel="Never mind" onConfirm={vi.fn()} onDismiss={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Never mind" })).toBeInTheDocument();
  });

  it("is a labelled dialog and focuses itself on open", () => {
    render(<ConfirmDialog title="Delete this invoice?" body="Body" confirmLabel="Delete" onConfirm={vi.fn()} onDismiss={vi.fn()} />);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveFocus();
  });

  it("calls onConfirm when the confirm button is clicked", async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(<ConfirmDialog title="Delete this invoice?" body="Body" confirmLabel="Delete" onConfirm={onConfirm} onDismiss={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onDismiss when the dismiss button, backdrop, or Escape is used", async () => {
    const onDismiss = vi.fn();
    const user = userEvent.setup();
    render(<ConfirmDialog title="Delete this invoice?" body="Body" confirmLabel="Delete" onConfirm={vi.fn()} onDismiss={onDismiss} />);

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(onDismiss).toHaveBeenCalledTimes(2);

    await user.keyboard("{Escape}");
    expect(onDismiss).toHaveBeenCalledTimes(3);
  });

  it("shows an inline error message when given", () => {
    render(<ConfirmDialog title="Cancel this invoice?" body="Body" confirmLabel="Cancel Invoice" error="A paid invoice cannot be cancelled." onConfirm={vi.fn()} onDismiss={vi.fn()} />);

    expect(screen.getByRole("alert")).toHaveTextContent("A paid invoice cannot be cancelled.");
  });

  it("disables both buttons and shows a pending label while pending", () => {
    render(<ConfirmDialog title="Delete this invoice?" body="Body" confirmLabel="Delete" pending onConfirm={vi.fn()} onDismiss={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Working…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });
});
