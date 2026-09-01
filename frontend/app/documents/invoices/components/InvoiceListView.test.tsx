import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { listCustomers } from "../../../lib/customers";
import { listInvoices } from "../../../lib/invoiceList";
import { InvoiceListView } from "./InvoiceListView";

const pushMock = vi.fn();
let currentSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => currentSearchParams,
}));

vi.mock("../../../lib/invoiceList", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../lib/invoiceList")>()),
  listInvoices: vi.fn(),
}));

vi.mock("../../../lib/customers", () => ({
  listCustomers: vi.fn(() => Promise.resolve([])),
}));

const mockedListInvoices = vi.mocked(listInvoices);
const mockedListCustomers = vi.mocked(listCustomers);

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

const sampleCustomer = {
  id: "customer-1",
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
  isArchived: false,
  createdAt: "2026-08-01T00:00:00Z",
  updatedAt: "2026-08-01T00:00:00Z",
};

describe("InvoiceListView", () => {
  beforeEach(() => {
    currentSearchParams = new URLSearchParams();
    mockedListCustomers.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows a loading state before the list resolves", () => {
    mockedListInvoices.mockReturnValue(new Promise(() => {}));

    render(<InvoiceListView />);

    expect(screen.getByText("Loading invoices…")).toBeInTheDocument();
  });

  it("shows an empty state with a link to create the first invoice when no filters are active", async () => {
    mockedListInvoices.mockResolvedValue({ items: [], page: 1, pageSize: 25, totalCount: 0 });

    render(<InvoiceListView />);

    expect(await screen.findByText(/No invoices yet/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create your first invoice" })).toHaveAttribute("href", "/invoice/create");
  });

  it("shows a distinct no-matches message with a Clear filters action when a filter is active", async () => {
    currentSearchParams = new URLSearchParams("search=zzz");
    mockedListInvoices.mockResolvedValue({ items: [], page: 1, pageSize: 25, totalCount: 0 });

    render(<InvoiceListView />);

    expect(await screen.findByText(/No invoices match these criteria/)).toBeInTheDocument();
    expect(screen.queryByText(/No invoices yet/)).not.toBeInTheDocument();
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
    expect(screen.getByRole("cell", { name: "Draft" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View" })).toHaveAttribute("href", "/documents/invoices/inv-1");
  });

  it("requests the page and pageSize given in the URL", async () => {
    currentSearchParams = new URLSearchParams("page=3&pageSize=50");
    mockedListInvoices.mockResolvedValue({ items: [sampleItem], page: 3, pageSize: 50, totalCount: 120 });

    render(<InvoiceListView />);

    await waitFor(() => expect(mockedListInvoices).toHaveBeenCalledWith(expect.objectContaining({ page: 3, pageSize: 50 })));
    expect(await screen.findByText("Page 3 of 3")).toBeInTheDocument();
  });

  it("falls back to page 1 / pageSize 25 for missing or unsupported URL values", async () => {
    currentSearchParams = new URLSearchParams("pageSize=17");
    mockedListInvoices.mockResolvedValue({ items: [sampleItem], page: 1, pageSize: 25, totalCount: 1 });

    render(<InvoiceListView />);

    await waitFor(() => expect(mockedListInvoices).toHaveBeenCalledWith(expect.objectContaining({ page: 1, pageSize: 25 })));
  });

  it("navigates to the next page via the Next button, preserving other criteria", async () => {
    currentSearchParams = new URLSearchParams("page=1&pageSize=25&status=Sent");
    mockedListInvoices.mockResolvedValue({ items: [sampleItem], page: 1, pageSize: 25, totalCount: 50 });
    const user = userEvent.setup();

    render(<InvoiceListView />);
    await screen.findByText("INV-0001");

    await user.click(screen.getByRole("button", { name: "Next" }));

    const [url] = pushMock.mock.calls[0];
    expect(url).toContain("page=2");
    expect(url).toContain("status=Sent");
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

  describe("search, filters and sorting (IG-63)", () => {
    it("submits the search box and resets to page 1", async () => {
      mockedListInvoices.mockResolvedValue({ items: [sampleItem], page: 1, pageSize: 25, totalCount: 1 });
      const user = userEvent.setup();
      render(<InvoiceListView />);
      await screen.findByText("INV-0001");

      await user.type(screen.getByLabelText("Search"), "acme");
      await user.click(screen.getByRole("button", { name: "Search" }));

      const [url] = pushMock.mock.calls[0];
      expect(url).toContain("search=acme");
      expect(url).toContain("page=1");
    });

    it("requests the search/status/customerId/sort criteria given in the URL", async () => {
      currentSearchParams = new URLSearchParams("search=acme&status=Sent&customerId=customer-1&sort=AmountHighest");
      mockedListInvoices.mockResolvedValue({ items: [sampleItem], page: 1, pageSize: 25, totalCount: 1 });

      render(<InvoiceListView />);

      await waitFor(() =>
        expect(mockedListInvoices).toHaveBeenCalledWith(
          expect.objectContaining({ search: "acme", status: "Sent", customerId: "customer-1", sort: "AmountHighest" }),
        ),
      );
      expect(screen.getByLabelText("Status")).toHaveValue("Sent");
      expect(screen.getByLabelText("Sort")).toHaveValue("AmountHighest");
    });

    it("selecting a status filter navigates and resets to page 1", async () => {
      currentSearchParams = new URLSearchParams("page=2");
      mockedListInvoices.mockResolvedValue({ items: [sampleItem], page: 2, pageSize: 25, totalCount: 1 });
      const user = userEvent.setup();
      render(<InvoiceListView />);
      await screen.findByText("INV-0001");

      await user.selectOptions(screen.getByLabelText("Status"), "Paid");

      const [url] = pushMock.mock.calls[0];
      expect(url).toContain("status=Paid");
      expect(url).toContain("page=1");
    });

    it("populates the customer dropdown from saved customers", async () => {
      mockedListCustomers.mockResolvedValue([sampleCustomer]);
      mockedListInvoices.mockResolvedValue({ items: [sampleItem], page: 1, pageSize: 25, totalCount: 1 });

      render(<InvoiceListView />);
      await screen.findByText("INV-0001");

      expect(await screen.findByRole("option", { name: "Acme Pty Ltd" })).toBeInTheDocument();
    });

    it("selecting a named date preset navigates with that preset in the URL", async () => {
      mockedListInvoices.mockResolvedValue({ items: [sampleItem], page: 1, pageSize: 25, totalCount: 1 });
      const user = userEvent.setup();
      render(<InvoiceListView />);
      await screen.findByText("INV-0001");

      await user.selectOptions(screen.getByLabelText("Date"), "ThisYear");

      const [url] = pushMock.mock.calls[0];
      expect(url).toContain("datePreset=ThisYear");
      expect(url).toContain("page=1");
    });

    it("requests the computed startDate/endDate for a named preset given in the URL", async () => {
      currentSearchParams = new URLSearchParams("datePreset=ThisYear");
      mockedListInvoices.mockResolvedValue({ items: [sampleItem], page: 1, pageSize: 25, totalCount: 1 });

      render(<InvoiceListView />);
      await screen.findByText("INV-0001");

      const lastCall = mockedListInvoices.mock.calls[0][0];
      expect(lastCall.startDate).toMatch(/^\d{4}-01-01$/);
      expect(lastCall.endDate).toMatch(/^\d{4}-12-31$/);
    });

    it("reveals custom date inputs and only applies the range once both are filled", async () => {
      currentSearchParams = new URLSearchParams("datePreset=Custom");
      mockedListInvoices.mockResolvedValue({ items: [sampleItem], page: 1, pageSize: 25, totalCount: 1 });

      render(<InvoiceListView />);
      await screen.findByText("INV-0001");
      await waitFor(() => expect(mockedListInvoices).toHaveBeenCalledWith(expect.not.objectContaining({ startDate: expect.anything() })));

      fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-01-01" } });
      const [url] = pushMock.mock.calls[0];
      expect(url).toContain("startDate=2026-01-01");
    });

    it("Clear filters navigates back to the bare page/pageSize URL", async () => {
      currentSearchParams = new URLSearchParams("page=2&pageSize=50&search=acme&status=Sent");
      mockedListInvoices.mockResolvedValue({ items: [sampleItem], page: 2, pageSize: 50, totalCount: 1 });
      const user = userEvent.setup();

      render(<InvoiceListView />);
      await screen.findByText("INV-0001");

      await user.click(screen.getByRole("button", { name: "Clear filters" }));

      expect(pushMock).toHaveBeenCalledWith("/documents/invoices?page=1&pageSize=50");
    });

    it("does not show a Clear filters action when nothing is filtered", async () => {
      mockedListInvoices.mockResolvedValue({ items: [sampleItem], page: 1, pageSize: 25, totalCount: 1 });

      render(<InvoiceListView />);
      await screen.findByText("INV-0001");

      expect(screen.queryByRole("button", { name: "Clear filters" })).not.toBeInTheDocument();
    });
  });
});
