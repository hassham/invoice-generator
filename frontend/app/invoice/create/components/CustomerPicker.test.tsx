import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Customer } from "../../../lib/customers";
import { CustomerPicker } from "./CustomerPicker";

const customers: Customer[] = [
  {
    id: "c1",
    businessName: "Acme Pty Ltd",
    contactName: "Jamie Lee",
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
    isArchived: false,
    createdAt: "2026-08-01T00:00:00Z",
    updatedAt: "2026-08-01T00:00:00Z",
  },
  {
    id: "c2",
    businessName: "Beta Co",
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
    isArchived: false,
    createdAt: "2026-08-01T00:00:00Z",
    updatedAt: "2026-08-01T00:00:00Z",
  },
];

describe("CustomerPicker", () => {
  it("shows no dropdown before 2 characters are typed", async () => {
    const user = userEvent.setup();
    render(<CustomerPicker customers={customers} onSelect={vi.fn()} />);

    await user.type(screen.getByLabelText("Search saved customers"), "A");

    expect(screen.queryByRole("button", { name: /Acme/ })).not.toBeInTheDocument();
  });

  it("shows matching customers, with contact name shown alongside a business name", async () => {
    const user = userEvent.setup();
    render(<CustomerPicker customers={customers} onSelect={vi.fn()} />);

    await user.type(screen.getByLabelText("Search saved customers"), "Ac");

    const match = await screen.findByRole("button", { name: /Acme Pty Ltd/ });
    expect(match).toHaveTextContent("Jamie Lee");
    expect(screen.queryByRole("button", { name: /Beta Co/ })).not.toBeInTheDocument();
  });

  it("shows a no-matches message when nothing matches", async () => {
    const user = userEvent.setup();
    render(<CustomerPicker customers={customers} onSelect={vi.fn()} />);

    await user.type(screen.getByLabelText("Search saved customers"), "Zephyr");

    expect(await screen.findByText("No matching customers.")).toBeInTheDocument();
  });

  it("calls onSelect with the chosen customer and resets the search box", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<CustomerPicker customers={customers} onSelect={onSelect} />);

    await user.type(screen.getByLabelText("Search saved customers"), "Ac");
    await user.click(await screen.findByRole("button", { name: /Acme Pty Ltd/ }));

    expect(onSelect).toHaveBeenCalledWith(customers[0]);
    expect(screen.getByLabelText("Search saved customers")).toHaveValue("");
  });
});
