import { render, screen, waitFor, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { listDocuments, type DocumentSummary } from "../../lib/documents";
import { DocumentListView } from "./DocumentListView";

const pushMock = vi.fn();
let currentSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => currentSearchParams,
}));

vi.mock("../../lib/documents", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../lib/documents")>()),
  listDocuments: vi.fn(),
}));

const mockedListDocuments = vi.mocked(listDocuments);

function doc(overrides: Partial<DocumentSummary> = {}): DocumentSummary {
  return {
    id: "doc-1",
    documentType: "Invoice",
    documentNumber: "INV-0001",
    partyName: "Acme Pty Ltd",
    issueDate: "2030-08-01",
    currency: "AUD",
    totalAmount: 220,
    status: "Draft",
    ...overrides,
  };
}

function resolveWith(items: DocumentSummary[], totalCount = items.length, pageSize = 25) {
  mockedListDocuments.mockResolvedValue({ items, page: 1, pageSize, totalCount });
}

const oneOfEach: DocumentSummary[] = [
  doc({ id: "inv-1", documentType: "Invoice", documentNumber: "INV-0001", status: "Draft" }),
  doc({ id: "est-1", documentType: "Estimate", documentNumber: "EST-0031", status: "Sent", totalAmount: 900 }),
  doc({ id: "cn-1", documentType: "CreditNote", documentNumber: "CN-abc0001", status: null, totalAmount: 150 }),
  doc({ id: "rcp-1", documentType: "Receipt", documentNumber: "RCP-20300801-001", status: null, totalAmount: 500 }),
  doc({
    id: "po-1",
    documentType: "PurchaseOrder",
    documentNumber: "PO-20300801-001",
    partyName: "Bolt Supply Co",
    status: null,
  }),
];

describe("DocumentListView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentSearchParams = new URLSearchParams();
  });

  it("shows a loading state before the fetch resolves", () => {
    mockedListDocuments.mockReturnValue(new Promise(() => {}));

    render(<DocumentListView />);

    expect(screen.getByText("Loading documents…")).toBeInTheDocument();
  });

  // IG-237's second AC: every type is labelled, on the list.
  it("labels every row with its document type", async () => {
    resolveWith(oneOfEach);

    render(<DocumentListView />);

    // Scoped to the table: the type filter's own <option>s carry these same labels, so an
    // unscoped query matches the dropdown rather than proving anything about the rows.
    const table = within(await screen.findByRole("table"));
    expect(table.getByText("Invoice")).toBeInTheDocument();
    expect(table.getByText("Estimate")).toBeInTheDocument();
    expect(table.getByText("Credit Note")).toBeInTheDocument();
    expect(table.getByText("Receipt")).toBeInTheDocument();
    expect(table.getByText("Purchase Order")).toBeInTheDocument();
  });

  it("links each row to the right place for its type", async () => {
    resolveWith(oneOfEach);

    render(<DocumentListView />);

    expect(await screen.findByRole("link", { name: "INV-0001" })).toHaveAttribute("href", "/documents/invoices/inv-1");
    expect(screen.getByRole("link", { name: "EST-0031" })).toHaveAttribute("href", "/documents/estimates/est-1");
    expect(screen.getByRole("link", { name: "PO-20300801-001" })).toHaveAttribute(
      "href",
      "/documents/purchase-orders/po-1"
    );
    // Neither of these has a detail page yet, so the row goes to its own list rather than nowhere.
    expect(screen.getByRole("link", { name: "CN-abc0001" })).toHaveAttribute("href", "/credit-notes");
    expect(screen.getByRole("link", { name: "RCP-20300801-001" })).toHaveAttribute("href", "/receipts");
  });

  it("names the counterparty neutrally, since a purchase order's is a supplier", async () => {
    resolveWith(oneOfEach);

    render(<DocumentListView />);

    expect(await screen.findByRole("columnheader", { name: "Customer / Supplier" })).toBeInTheDocument();
    expect(screen.getByText("Bolt Supply Co")).toBeInTheDocument();
  });

  it("shows a status for the types that have one and a dash for those that do not", async () => {
    resolveWith([oneOfEach[0], oneOfEach[2]]);

    render(<DocumentListView />);

    await screen.findByText("INV-0001");
    const creditNoteRow = screen.getByRole("link", { name: "CN-abc0001" }).closest("tr")!;
    expect(within(creditNoteRow).getByText("—")).toBeInTheDocument();
    expect(screen.getByText("Draft")).toBeInTheDocument();
  });

  // IG-237's first AC.
  it("requests only the chosen type when the type filter changes", async () => {
    resolveWith(oneOfEach);
    const user = userEvent.setup();

    render(<DocumentListView />);
    await screen.findByText("INV-0001");
    await user.selectOptions(screen.getByLabelText("Document type"), "PurchaseOrder");

    expect(pushMock).toHaveBeenCalledWith("/documents?documentType=PurchaseOrder&page=1");
  });

  it("asks the backend for the active type from the URL", async () => {
    currentSearchParams = new URLSearchParams("documentType=Estimate");
    resolveWith([oneOfEach[1]]);

    render(<DocumentListView />);

    await waitFor(() => {
      expect(mockedListDocuments).toHaveBeenCalledWith(
        expect.objectContaining({ documentType: "Estimate" })
      );
    });
  });

  it("ignores an unknown document type in the URL rather than sending it on", async () => {
    currentSearchParams = new URLSearchParams("documentType=Nonsense");
    resolveWith(oneOfEach);

    render(<DocumentListView />);

    await waitFor(() => {
      expect(mockedListDocuments).toHaveBeenCalledWith(
        expect.objectContaining({ documentType: undefined })
      );
    });
  });

  it("submits a search term", async () => {
    resolveWith(oneOfEach);
    const user = userEvent.setup();

    render(<DocumentListView />);
    await screen.findByText("INV-0001");
    await user.type(screen.getByLabelText("Search"), "bolt");
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(pushMock).toHaveBeenCalledWith("/documents?search=bolt&page=1");
  });

  it("offers a clear action only once a filter is active", async () => {
    resolveWith(oneOfEach);

    const { unmount } = render(<DocumentListView />);
    await screen.findByText("INV-0001");
    expect(screen.queryByRole("button", { name: "Clear filters" })).not.toBeInTheDocument();
    unmount();

    currentSearchParams = new URLSearchParams("search=bolt");
    resolveWith(oneOfEach);
    render(<DocumentListView />);

    expect(await screen.findByRole("button", { name: "Clear filters" })).toBeInTheDocument();
  });

  it("pages through the combined set", async () => {
    resolveWith(oneOfEach, 60);
    const user = userEvent.setup();

    render(<DocumentListView />);
    await screen.findByText("INV-0001");

    expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(pushMock).toHaveBeenCalledWith("/documents?page=2");
  });

  it("shows an empty state when nothing exists yet", async () => {
    resolveWith([]);

    render(<DocumentListView />);

    expect(await screen.findByText(/No documents yet\./)).toBeInTheDocument();
  });

  it("distinguishes an empty filter result from an empty account", async () => {
    currentSearchParams = new URLSearchParams("documentType=Receipt");
    resolveWith([]);

    render(<DocumentListView />);

    expect(await screen.findByText(/No documents match these criteria\./)).toBeInTheDocument();
  });

  it("shows an error message on failure", async () => {
    mockedListDocuments.mockRejectedValue(new Error("Failed to load your documents."));

    render(<DocumentListView />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Failed to load your documents.");
  });
});
