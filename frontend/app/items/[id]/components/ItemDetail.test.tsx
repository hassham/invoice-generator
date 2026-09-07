import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ItemDetail } from "./ItemDetail";

const sampleItem = {
  id: "i1",
  name: "Consulting Hour",
  description: "One hour of consulting",
  sku: "SKU-1",
  unit: "hour",
  unitPrice: 150,
  taxRate: 10,
  isArchived: false,
  createdAt: "2026-08-01T00:00:00Z",
  updatedAt: "2026-08-01T00:00:00Z",
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("ItemDetail", () => {
  it("shows a loading state before the item resolves", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));

    render(<ItemDetail itemId="i1" />);

    expect(screen.getByText("Loading item…")).toBeInTheDocument();
  });

  it("shows an error state when the item fails to load", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({ detail: "Item not found." }) }));

    render(<ItemDetail itemId="missing" />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Item not found.");
  });

  it("loads the item, pre-fills the form and saves changes", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(sampleItem) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ ...sampleItem, unitPrice: 200 }) });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<ItemDetail itemId="i1" />);
    await screen.findByLabelText("Name");
    expect(screen.getByLabelText("Name")).toHaveValue("Consulting Hour");
    expect(screen.getByLabelText("Unit Price")).toHaveValue(150);

    await user.clear(screen.getByLabelText("Unit Price"));
    await user.type(screen.getByLabelText("Unit Price"), "200");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Changes saved.");
    expect(fetchMock).toHaveBeenLastCalledWith(
      expect.stringContaining("/api/v1/items/i1"),
      expect.objectContaining({ method: "PUT" }),
    );
  });

  it("archives the item and shows the Archived badge", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(sampleItem) })
      .mockResolvedValueOnce({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<ItemDetail itemId="i1" />);
    await screen.findByRole("button", { name: "Archive" });

    await user.click(screen.getByRole("button", { name: "Archive" }));

    await waitFor(() => expect(screen.getByText("Archived")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Archive" })).not.toBeInTheDocument();
  });
});
