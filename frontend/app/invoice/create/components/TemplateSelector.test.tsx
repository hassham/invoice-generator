import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Template } from "../lib/templates";
import { TemplateSelector } from "./TemplateSelector";

const templates: Template[] = [
  { id: "1", name: "Classic", templateCode: "classic", previewImage: null, isPremium: false, sortOrder: 1 },
  { id: "2", name: "Modern", templateCode: "modern", previewImage: null, isPremium: false, sortOrder: 2 },
  { id: "3", name: "Signature", templateCode: "signature", previewImage: null, isPremium: true, sortOrder: 3 },
];

describe("TemplateSelector", () => {
  it("shows a loading message instead of templates while loading", () => {
    render(<TemplateSelector templates={[]} selectedTemplateId="" loading error={null} onSelect={vi.fn()} />);

    expect(screen.getByText(/Loading templates/)).toBeInTheDocument();
  });

  it("shows an error message instead of templates when loading failed", () => {
    render(<TemplateSelector templates={[]} selectedTemplateId="" loading={false} error="Failed to load templates." onSelect={vi.fn()} />);

    expect(screen.getByText("Failed to load templates.")).toBeInTheDocument();
  });

  it("renders one card per template", () => {
    render(<TemplateSelector templates={templates} selectedTemplateId="1" loading={false} error={null} onSelect={vi.fn()} />);

    expect(screen.getByRole("button", { name: /Classic/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Modern/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Signature/ })).toBeInTheDocument();
  });

  it("marks the selected template with aria-pressed", () => {
    render(<TemplateSelector templates={templates} selectedTemplateId="2" loading={false} error={null} onSelect={vi.fn()} />);

    expect(screen.getByRole("button", { name: /Classic/ })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: /Modern/ })).toHaveAttribute("aria-pressed", "true");
  });

  it("clicking a free template calls onSelect with its id", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<TemplateSelector templates={templates} selectedTemplateId="1" loading={false} error={null} onSelect={onSelect} />);

    await user.click(screen.getByRole("button", { name: /Modern/ }));

    expect(onSelect).toHaveBeenCalledWith("2");
  });

  it("clicking a premium template does not call onSelect and shows an upgrade message instead", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<TemplateSelector templates={templates} selectedTemplateId="1" loading={false} error={null} onSelect={onSelect} />);

    await user.click(screen.getByRole("button", { name: /Signature/ }));

    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Upgrade to Pro to use this template.");
  });
});
