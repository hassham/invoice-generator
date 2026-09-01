import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CustomerDetail } from "./CustomerDetail";

const sampleCustomer = {
  id: "c1",
  businessName: "Acme Pty Ltd",
  contactName: "Jamie Lee",
  email: "billing@acme.example",
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
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("CustomerDetail", () => {
  it("shows a loading state before the customer resolves", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));

    render(<CustomerDetail customerId="c1" />);

    expect(screen.getByText("Loading customer…")).toBeInTheDocument();
  });

  it("shows an error state when the customer fails to load", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({ detail: "Customer not found." }) }));

    render(<CustomerDetail customerId="missing" />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Customer not found.");
  });

  it("loads the customer, pre-fills the form and saves changes", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(sampleCustomer) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ ...sampleCustomer, contactName: "Updated Contact" }) });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<CustomerDetail customerId="c1" />);
    await screen.findByLabelText("Business Name");
    expect(screen.getByLabelText("Business Name")).toHaveValue("Acme Pty Ltd");

    await user.clear(screen.getByLabelText("Contact Name"));
    await user.type(screen.getByLabelText("Contact Name"), "Updated Contact");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Changes saved.");
    expect(fetchMock).toHaveBeenLastCalledWith(
      expect.stringContaining("/api/v1/customers/c1"),
      expect.objectContaining({ method: "PUT" }),
    );
  });

  it("archives the customer and shows the Archived badge", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(sampleCustomer) })
      .mockResolvedValueOnce({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<CustomerDetail customerId="c1" />);
    await screen.findByRole("button", { name: "Archive" });

    await user.click(screen.getByRole("button", { name: "Archive" }));

    await waitFor(() => expect(screen.getByText("Archived")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Archive" })).not.toBeInTheDocument();
  });
});
