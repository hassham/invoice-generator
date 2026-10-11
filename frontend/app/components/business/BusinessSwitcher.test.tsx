import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { listBusinesses, type BusinessProfile } from "../../lib/business";
import { BusinessSwitcher } from "./BusinessSwitcher";

vi.mock("../../lib/business", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../lib/business")>()),
  listBusinesses: vi.fn(),
}));

const mockedListBusinesses = vi.mocked(listBusinesses);

function business(id: string, businessName: string): BusinessProfile {
  return { id, businessName, defaultCurrency: "AUD", country: "AU", invoicePrefix: "INV-", nextInvoiceNumber: 1, invoiceNumberPadding: 4 } as BusinessProfile;
}

describe("BusinessSwitcher", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
    Object.defineProperty(window, "location", { value: { ...originalLocation, reload: vi.fn() }, writable: true });
  });

  afterEach(() => {
    Object.defineProperty(window, "location", { value: originalLocation, writable: true });
  });

  it("lists the account's businesses and shows the first one when nothing is chosen", async () => {
    mockedListBusinesses.mockResolvedValue([business("biz-1", "Acme Pty Ltd"), business("biz-2", "Side Project")]);

    render(<BusinessSwitcher />);

    const select = await screen.findByRole("combobox", { name: "Business" });
    expect(select).toHaveValue("biz-1");
    expect(screen.getByRole("option", { name: "Side Project" })).toBeInTheDocument();
  });

  it("shows the business the user previously chose", async () => {
    window.localStorage.setItem("selectedBusinessId", "biz-2");
    mockedListBusinesses.mockResolvedValue([business("biz-1", "Acme Pty Ltd"), business("biz-2", "Side Project")]);

    render(<BusinessSwitcher />);

    expect(await screen.findByRole("combobox", { name: "Business" })).toHaveValue("biz-2");
  });

  it("stores the new choice and reloads so every screen fetches for it", async () => {
    mockedListBusinesses.mockResolvedValue([business("biz-1", "Acme Pty Ltd"), business("biz-2", "Side Project")]);
    render(<BusinessSwitcher />);
    await screen.findByRole("combobox", { name: "Business" });

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Business" }), "biz-2");

    expect(window.localStorage.getItem("selectedBusinessId")).toBe("biz-2");
    expect(window.location.reload).toHaveBeenCalled();
  });

  it("renders nothing when the businesses can't be loaded", async () => {
    mockedListBusinesses.mockRejectedValue(new Error("network down"));

    const { container } = render(<BusinessSwitcher />);

    await waitFor(() => expect(mockedListBusinesses).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});
