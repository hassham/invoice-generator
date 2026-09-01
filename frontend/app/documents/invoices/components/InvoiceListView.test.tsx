import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { listInvoices } from "../../../lib/invoiceList";
import { InvoiceListView } from "./InvoiceListView";

const pushMock = vi.fn();
let currentSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => currentSearchParams,
}));

vi.mock("../../../lib/invoiceList", () => ({
  listInvoices: vi.fn(),
}));

const mockedListInvoices = vi.mocked(listInvoices);

const sampleItem = {
  id: "inv-1",
  invoiceNumber: "INV-0001",
  customerName: "Acme Pty Ltd",
  status: "Draft",
  issueDate: "2026-08-01",
  dueDate: "2026-08-15",
  currency: "AUD",
  totalAmount: 220,
  amountDue: 220,
};

describe("InvoiceListView", () => {
  beforeEach(() => {
    currentSearchParams = new URLSearchParams();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows a loading state before the list resolves", () => {
    mockedListInvoices.mockReturnValue(new Promise(() => {}));

    render(<InvoiceListView />);

    expect(screen.getByText("Loading invoices…")).toBeInTheDocument();
  });

  it("shows an empty state with a link to create the first invoice", async () => {
    mockedListInvoices.mockResolvedValue({ items: [], page: 1, pageSize: 25, totalCount: 0 });

    render(<InvoiceListView />);

    expect(await screen.findByText(/No invoices yet/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create your first invoice" })).toHaveAttribute("href", "/invoice/create");
  });

  it("shows an error state when the list fails to load", async () => {
    mockedListInvoices.mockRejectedValue(new Error("Your session has expired. Please sign in again."));

    render(<InvoiceListView />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Your session has expired. Please sign in again.");
  });

  it("renders the loaded invoices with their summary fields and a View link", async () => {
    mockedListInvoices.mockResolvedValue({ items: [sampleItem], page: 1, pageSize: 25, totalCount: 1 });

    render(<InvoiceListView />);

    expect(await screen.findByText("INV-0001")).toBeInTheDocument();
    expect(screen.getByText("Acme Pty Ltd")).toBeInTheDocument();
    // Amount and Amount Due are both 220.00 for this sample item, so the formatted text appears twice.
    expect(screen.getAllByText("AUD 220.00")).toHaveLength(2);
    expect(screen.getByText("Draft")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View" })).toHaveAttribute("href", "/documents/invoices/inv-1");
  });

  it("requests the page and pageSize given in the URL", async () => {
    currentSearchParams = new URLSearchParams("page=3&pageSize=50");
    mockedListInvoices.mockResolvedValue({ items: [sampleItem], page: 3, pageSize: 50, totalCount: 120 });

    render(<InvoiceListView />);

    await waitFor(() => expect(mockedListInvoices).toHaveBeenCalledWith(3, 50));
    expect(await screen.findByText("Page 3 of 3")).toBeInTheDocument();
  });

  it("falls back to page 1 / pageSize 25 for missing or unsupported URL values", async () => {
    currentSearchParams = new URLSearchParams("pageSize=17");
    mockedListInvoices.mockResolvedValue({ items: [sampleItem], page: 1, pageSize: 25, totalCount: 1 });

    render(<InvoiceListView />);

    await waitFor(() => expect(mockedListInvoices).toHaveBeenCalledWith(1, 25));
  });

  it("navigates to the next page via the Next button", async () => {
    currentSearchParams = new URLSearchParams("page=1&pageSize=25");
    mockedListInvoices.mockResolvedValue({ items: [sampleItem], page: 1, pageSize: 25, totalCount: 50 });
    const user = userEvent.setup();

    render(<InvoiceListView />);
    await screen.findByText("INV-0001");

    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(pushMock).toHaveBeenCalledWith("/documents/invoices?page=2&pageSize=25");
  });

  it("disables Previous on the first page and Next on the last page", async () => {
    currentSearchParams = new URLSearchParams("page=1&pageSize=25");
    mockedListInvoices.mockResolvedValue({ items: [sampleItem], page: 1, pageSize: 25, totalCount: 1 });

    render(<InvoiceListView />);
    await screen.findByText("INV-0001");

    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });

  it("changing the page size navigates back to page 1 with the new size", async () => {
    currentSearchParams = new URLSearchParams("page=2&pageSize=25");
    mockedListInvoices.mockResolvedValue({ items: [sampleItem], page: 2, pageSize: 25, totalCount: 60 });
    const user = userEvent.setup();

    render(<InvoiceListView />);
    await screen.findByText("INV-0001");

    await user.selectOptions(screen.getByLabelText("Per page"), "50");

    expect(pushMock).toHaveBeenCalledWith("/documents/invoices?page=1&pageSize=50");
  });
});
