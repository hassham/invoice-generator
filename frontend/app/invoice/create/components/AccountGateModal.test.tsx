import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resetAnalyticsSink, setAnalyticsSink, type AnalyticsSink } from "../../../../lib/analytics";
import { AccountGateModal } from "./AccountGateModal";

describe("AccountGateModal", () => {
  afterEach(() => {
    resetAnalyticsSink();
  });

  it("renders FSD's exact message and both auth options", () => {
    render(<AccountGateModal action="download" onClose={vi.fn()} />);

    expect(screen.getByText("Create a free account to download and securely save your invoice.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign up" })).toHaveAttribute("href", "/signup");
    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login");
  });

  it("is a labelled dialog and focuses itself on open", () => {
    render(<AccountGateModal action="download" onClose={vi.fn()} />);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveFocus();
  });

  it("calls onClose when Not now is clicked", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<AccountGateModal action="download" onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: "Not now" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when the backdrop is clicked", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<AccountGateModal action="download" onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose on Escape", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<AccountGateModal action="download" onClose={onClose} />);

    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("tracks anonymous_gate_conversion with the pending action and signup method when Sign up is clicked", async () => {
    const sink: AnalyticsSink = { track: vi.fn() };
    setAnalyticsSink(sink);
    const user = userEvent.setup();
    render(<AccountGateModal action="print" onClose={vi.fn()} />);

    await user.click(screen.getByRole("link", { name: "Sign up" }));

    expect(sink.track).toHaveBeenCalledWith({
      name: "anonymous_gate_conversion",
      properties: { action: "print", method: "signup" },
    });
  });

  it("tracks anonymous_gate_conversion with the login method when Log in is clicked", async () => {
    const sink: AnalyticsSink = { track: vi.fn() };
    setAnalyticsSink(sink);
    const user = userEvent.setup();
    render(<AccountGateModal action="download" onClose={vi.fn()} />);

    await user.click(screen.getByRole("link", { name: "Log in" }));

    expect(sink.track).toHaveBeenCalledWith({
      name: "anonymous_gate_conversion",
      properties: { action: "download", method: "login" },
    });
  });
});
