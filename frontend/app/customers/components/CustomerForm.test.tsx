import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CustomerForm, emptyCustomerFormValues, type CustomerFormValues } from "./CustomerForm";

describe("CustomerForm", () => {
  it("rejects submission when neither business name nor contact name is filled", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<CustomerForm submitting={false} submitLabel="Create customer" error={null} onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: "Create customer" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Enter a business name or a contact name.");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits a request with blank optional fields converted to null", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<CustomerForm submitting={false} submitLabel="Create customer" error={null} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Business Name"), "Acme Pty Ltd");
    await user.click(screen.getByRole("button", { name: "Create customer" }));

    expect(onSubmit).toHaveBeenCalledWith({
      businessName: "Acme Pty Ltd",
      contactName: null,
      email: null,
      phone: null,
      addressLine1: null,
      addressLine2: null,
      city: null,
      state: null,
      postalCode: null,
      country: null,
      taxNumber: null,
      notes: null,
    });
  });

  it("accepts a request identified only by contact name", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<CustomerForm submitting={false} submitLabel="Create customer" error={null} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Contact Name"), "Jamie Lee");
    await user.click(screen.getByRole("button", { name: "Create customer" }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ businessName: null, contactName: "Jamie Lee" }));
  });

  it("pre-fills every field from initialValues", () => {
    const initialValues: CustomerFormValues = {
      ...emptyCustomerFormValues,
      businessName: "Acme Pty Ltd",
      email: "billing@acme.example",
    };
    render(<CustomerForm initialValues={initialValues} submitting={false} submitLabel="Save changes" error={null} onSubmit={vi.fn()} />);

    expect(screen.getByLabelText("Business Name")).toHaveValue("Acme Pty Ltd");
    expect(screen.getByLabelText("Email")).toHaveValue("billing@acme.example");
  });

  it("shows the server error banner and disables submit while submitting", () => {
    render(<CustomerForm submitting error="Failed to save changes to this customer." submitLabel="Save changes" onSubmit={vi.fn()} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Failed to save changes to this customer.");
    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
  });
});
