import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ItemListView } from "./ItemListView";

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

describe("ItemListView", () => {
  it("shows a loading state before the list resolves", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));

    render(<ItemListView />);

    expect(screen.getByText("Loading items…")).toBeInTheDocument();
  });

  it("shows an empty state with a link to add the first item", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve([]) }));

    render(<ItemListView />);

    expect(await screen.findByText(/No items yet/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add your first item" })).toHaveAttribute("href", "/items/new");
  });

  it("shows an error state when the list fails to load", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({ detail: "Your session has expired. Please sign in again." }) }));

    render(<ItemListView />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Your session has expired. Please sign in again.");
  });

  it("renders the loaded items with name, description, unit, price, tax and status", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve([sampleItem]) }));

    render(<ItemListView />);

    expect(await screen.findByText("Consulting Hour")).toBeInTheDocument();
    expect(screen.getByText("One hour of consulting")).toBeInTheDocument();
    expect(screen.getByText("hour")).toBeInTheDocument();
    expect(screen.getByText("150.00")).toBeInTheDocument();
    expect(screen.getByText("10%")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Edit" })).toHaveAttribute("href", "/items/i1");
  });

  it("archives an item and removes the Archive button, keeping it in the list", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([sampleItem]) })
      .mockResolvedValueOnce({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<ItemListView />);
    await screen.findByText("Consulting Hour");

    await user.click(screen.getByRole("button", { name: "Archive" }));

    await waitFor(() => expect(screen.queryByText("Consulting Hour")).not.toBeInTheDocument());
    expect(fetchMock).toHaveBeenLastCalledWith(expect.stringContaining("/api/v1/items/i1"), expect.objectContaining({ method: "DELETE" }));
  });

  it("shows an error when archiving fails, keeping the item in the list", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([sampleItem]) })
      .mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({ detail: "Item not found." }) });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<ItemListView />);
    await screen.findByText("Consulting Hour");

    await user.click(screen.getByRole("button", { name: "Archive" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Item not found.");
    expect(screen.getByText("Consulting Hour")).toBeInTheDocument();
  });

  it("duplicates an item and adds the copy to the list", async () => {
    const duplicated = { ...sampleItem, id: "i2", name: "Consulting Hour (Copy)" };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([sampleItem]) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(duplicated) });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<ItemListView />);
    await screen.findByText("Consulting Hour");

    await user.click(screen.getByRole("button", { name: "Duplicate" }));

    expect(await screen.findByText("Consulting Hour (Copy)")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith(expect.stringContaining("/api/v1/items/i1/duplicate"), expect.objectContaining({ method: "POST" }));
  });

  it("shows an error when duplicating fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([sampleItem]) })
      .mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({ detail: "Item not found." }) });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<ItemListView />);
    await screen.findByText("Consulting Hour");

    await user.click(screen.getByRole("button", { name: "Duplicate" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Item not found.");
  });
});
