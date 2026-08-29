import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CreateInvoicePage, { metadata } from "./page";

// This page's editor fetches templates (IG-39) and checks the session (IG-30) on mount - stubbed
// here, same as CreateInvoiceEditor.test.tsx, so this suite doesn't depend on a running backend.
vi.mock("./lib/templates", () => ({
  fetchTemplates: vi.fn(() => Promise.resolve([])),
}));

vi.mock("../../lib/auth", () => ({
  getCurrentSession: vi.fn(() => Promise.resolve(null)),
}));

describe("Create invoice page", () => {
  it("renders the invoice header, From and Bill To sections", () => {
    render(<CreateInvoicePage />);

    expect(screen.getByRole("group", { name: "Invoice details" })).toBeInTheDocument();
    expect(screen.getByLabelText("From", { exact: false })).toBeInTheDocument();
    expect(screen.getByLabelText("Bill To", { exact: false })).toBeInTheDocument();
  });

  it("renders the mobile Edit/Preview tabs", () => {
    render(<CreateInvoicePage />);

    expect(screen.getByRole("tab", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Preview" })).toBeInTheDocument();
  });

  it("exposes a title, description and canonical URL matching FSD section 10.1's route", () => {
    expect(metadata.title).toBeTruthy();
    expect(metadata.description).toBeTruthy();
    expect(metadata.alternates?.canonical).toBe("/invoice/create");
  });
});
