import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ItemForm, emptyItemFormValues, type ItemFormValues } from "./ItemForm";

describe("ItemForm", () => {
  it("rejects submission when the name is blank", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<ItemForm submitting={false} submitLabel="Create item" error={null} onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: "Create item" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Name is required.");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits a request with blank optional fields converted to null and numeric fields parsed", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<ItemForm submitting={false} submitLabel="Create item" error={null} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Name"), "Consulting Hour");
    await user.type(screen.getByLabelText("Unit Price"), "150");
    await user.click(screen.getByRole("button", { name: "Create item" }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: "Consulting Hour",
      description: null,
      sku: null,
      unit: null,
      unitPrice: 150,
      taxRate: null,
    });
  });

  it("parses a filled tax rate", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<ItemForm submitting={false} submitLabel="Create item" error={null} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Name"), "Consulting Hour");
    await user.type(screen.getByLabelText("Unit Price"), "150");
    await user.type(screen.getByLabelText("Tax Rate (%)"), "10");
    await user.click(screen.getByRole("button", { name: "Create item" }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ taxRate: 10 }));
  });

  it("treats a blank unit price as 0 rather than NaN", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<ItemForm submitting={false} submitLabel="Create item" error={null} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Name"), "Free Sample");
    await user.click(screen.getByRole("button", { name: "Create item" }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ unitPrice: 0 }));
  });

  it("pre-fills every field from initialValues", () => {
    const initialValues: ItemFormValues = {
      ...emptyItemFormValues,
      name: "Consulting Hour",
      unitPrice: "150",
    };
    render(<ItemForm initialValues={initialValues} submitting={false} submitLabel="Save changes" error={null} onSubmit={vi.fn()} />);

    expect(screen.getByLabelText("Name")).toHaveValue("Consulting Hour");
    expect(screen.getByLabelText("Unit Price")).toHaveValue(150);
  });

  it("shows the server error banner and disables submit while submitting", () => {
    render(<ItemForm submitting error="Failed to save changes to this item." submitLabel="Save changes" onSubmit={vi.fn()} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Failed to save changes to this item.");
    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
  });
});
