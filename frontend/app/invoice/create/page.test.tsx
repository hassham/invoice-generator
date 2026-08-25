import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import CreateInvoicePage, { metadata } from "./page";

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
