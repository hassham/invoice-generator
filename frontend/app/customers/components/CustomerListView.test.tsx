import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CustomerListView } from "./CustomerListView";

const sampleCustomer = {
  id: "c1",
  businessName: "Acme Pty Ltd",
  contactName: "Jamie Lee",
  email: "billing@acme.example",
  phone: "0400000000",
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
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("CustomerListView", () => {
  it("shows a loading state before the list resolves", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));

    render(<CustomerListView />);

    expect(screen.getByText("Loading customers…")).toBeInTheDocument();
  });

  it("shows an empty state with a link to add the first customer", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve([]) }));

    render(<CustomerListView />);

    expect(await screen.findByText(/No customers yet/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add your first customer" })).toHaveAttribute("href", "/customers/new");
  });

  it("shows an error state when the list fails to load", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({ detail: "Your session has expired. Please sign in again." }) }));

    render(<CustomerListView />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Your session has expired. Please sign in again.");
  });

  it("renders the loaded customers with name, contact, email and phone", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve([sampleCustomer]) }));

    render(<CustomerListView />);

    expect(await screen.findByText("Acme Pty Ltd")).toBeInTheDocument();
    expect(screen.getByText("Jamie Lee")).toBeInTheDocument();
    expect(screen.getByText("billing@acme.example")).toBeInTheDocument();
    expect(screen.getByText("0400000000")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View" })).toHaveAttribute("href", "/customers/c1");
  });

  it("falls back to the contact name as the customer name when there is no business name", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve([{ ...sampleCustomer, businessName: null }]) }),
    );

    render(<CustomerListView />);

    expect(await screen.findByRole("cell", { name: "Jamie Lee" })).toBeInTheDocument();
  });

  it("archives a customer and removes it from the list", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([sampleCustomer]) })
      .mockResolvedValueOnce({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<CustomerListView />);
    await screen.findByText("Acme Pty Ltd");

    await user.click(screen.getByRole("button", { name: "Archive" }));

    await waitFor(() => expect(screen.queryByText("Acme Pty Ltd")).not.toBeInTheDocument());
    expect(fetchMock).toHaveBeenLastCalledWith(expect.stringContaining("/api/v1/customers/c1"), expect.objectContaining({ method: "DELETE" }));
  });

  it("shows an error when archiving fails, keeping the customer in the list", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([sampleCustomer]) })
      .mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({ detail: "Customer not found." }) });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<CustomerListView />);
    await screen.findByText("Acme Pty Ltd");

    await user.click(screen.getByRole("button", { name: "Archive" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Customer not found.");
    expect(screen.getByText("Acme Pty Ltd")).toBeInTheDocument();
  });
});
