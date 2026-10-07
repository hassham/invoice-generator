import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getBusinessProfile } from "../../../../lib/business";
import { downloadPurchaseOrderPdf, getPurchaseOrder } from "../../../../lib/purchaseOrders";
import { PurchaseOrderDetail } from "./PurchaseOrderDetail";

vi.mock("../../../../lib/business", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../../lib/business")>()),
  getBusinessProfile: vi.fn(),
}));

vi.mock("../../../../lib/purchaseOrders", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../../lib/purchaseOrders")>()),
  getPurchaseOrder: vi.fn(),
  downloadPurchaseOrderPdf: vi.fn(),
}));

const mockedGetBusinessProfile = vi.mocked(getBusinessProfile);
const mockedGetPurchaseOrder = vi.mocked(getPurchaseOrder);
const mockedDownloadPdf = vi.mocked(downloadPurchaseOrderPdf);

beforeEach(() => {
  vi.clearAllMocks();
});

const samplePurchaseOrder = {
  id: "po-1",
  businessId: "biz-1",
  businessName: "My Business",
  supplierId: "sup-1",
  supplierName: "Bolt Supply Co",
  poNumber: "PO-20300801-001",
  issueDate: "2030-08-01",
  dueDate: "2030-08-15",
  currency: "AUD",
  reference: "REQ-9",
  subtotal: 200,
  taxAmount: 20,
  totalAmount: 220,
  notes: "Deliver to loading dock",
  terms: null,
  deliveryInstructions: "Call on arrival",
  items: [
    {
      description: "Steel bracket",
      quantity: 2,
      unit: "Each",
      unitPrice: 100,
      taxRate: 10,
      discount: 0,
      lineSubtotal: 200,
      taxAmount: 20,
      lineTotal: 220,
    },
  ],
  createdAt: "2030-08-01T00:00:00Z",
  updatedAt: "2030-08-01T00:00:00Z",
};

function resolveBusiness() {
  mockedGetBusinessProfile.mockResolvedValue({ id: "biz-1" } as Awaited<ReturnType<typeof getBusinessProfile>>);
}

describe("PurchaseOrderDetail", () => {
  it("shows a loading state before the fetch resolves", () => {
    resolveBusiness();
    mockedGetPurchaseOrder.mockReturnValue(new Promise(() => {}));

    render(<PurchaseOrderDetail purchaseOrderId="po-1" />);

    expect(screen.getByText(/Loading purchase order/)).toBeInTheDocument();
  });

  // IG-292's AC: the detail view must not read as an invoice or estimate.
  it("leads with the purchase order document type and number", async () => {
    resolveBusiness();
    mockedGetPurchaseOrder.mockResolvedValue(samplePurchaseOrder);

    render(<PurchaseOrderDetail purchaseOrderId="po-1" />);

    expect(await screen.findByRole("heading", { name: "PO-20300801-001" })).toBeInTheDocument();
    expect(screen.getByText("Purchase Order")).toBeInTheDocument();
  });

  it("names the counterparty as the supplier and the account as the orderer", async () => {
    resolveBusiness();
    mockedGetPurchaseOrder.mockResolvedValue(samplePurchaseOrder);

    render(<PurchaseOrderDetail purchaseOrderId="po-1" />);

    expect(await screen.findByText("Supplier")).toBeInTheDocument();
    expect(screen.getByText("Bolt Supply Co")).toBeInTheDocument();
    expect(screen.getByText("Ordered by")).toBeInTheDocument();
    expect(screen.getByText("My Business")).toBeInTheDocument();
    expect(screen.queryByText("Customer")).not.toBeInTheDocument();
  });

  it("renders the totals breakdown", async () => {
    resolveBusiness();
    mockedGetPurchaseOrder.mockResolvedValue(samplePurchaseOrder);

    render(<PurchaseOrderDetail purchaseOrderId="po-1" />);

    expect(await screen.findByText("AUD 200.00")).toBeInTheDocument();
    expect(screen.getByText("AUD 20.00")).toBeInTheDocument();
    // Twice over: once as the single line's total, once as the order total.
    expect(screen.getAllByText("AUD 220.00")).toHaveLength(2);
    expect(screen.getByText("Total").parentElement).toHaveTextContent("AUD 220.00");
  });

  it("renders delivery instructions and notes when present", async () => {
    resolveBusiness();
    mockedGetPurchaseOrder.mockResolvedValue(samplePurchaseOrder);

    render(<PurchaseOrderDetail purchaseOrderId="po-1" />);

    expect(await screen.findByText("Call on arrival")).toBeInTheDocument();
    expect(screen.getByText("Deliver to loading dock")).toBeInTheDocument();
  });

  it("omits optional sections that have no content", async () => {
    resolveBusiness();
    mockedGetPurchaseOrder.mockResolvedValue({
      ...samplePurchaseOrder,
      notes: null,
      deliveryInstructions: null,
      reference: null,
    });

    render(<PurchaseOrderDetail purchaseOrderId="po-1" />);

    await screen.findByRole("heading", { name: "PO-20300801-001" });
    expect(screen.queryByText("Delivery instructions")).not.toBeInTheDocument();
    expect(screen.queryByText("Notes")).not.toBeInTheDocument();
    expect(screen.queryByText("Reference")).not.toBeInTheDocument();
  });

  // IG-306: line items used to be discarded on create, so the detail view had nothing to show.
  it("renders the ordered line items", async () => {
    resolveBusiness();
    mockedGetPurchaseOrder.mockResolvedValue(samplePurchaseOrder);

    render(<PurchaseOrderDetail purchaseOrderId="po-1" />);

    expect(await screen.findByRole("columnheader", { name: "Description" })).toBeInTheDocument();
    expect(screen.getByText("Steel bracket")).toBeInTheDocument();
    expect(screen.getByText("2 Each")).toBeInTheDocument();
    expect(screen.getByText("AUD 100.00")).toBeInTheDocument();
  });

  it("downloads the purchase order PDF", async () => {
    const user = userEvent.setup();
    resolveBusiness();
    mockedGetPurchaseOrder.mockResolvedValue(samplePurchaseOrder);
    mockedDownloadPdf.mockResolvedValue(undefined);

    render(<PurchaseOrderDetail purchaseOrderId="po-1" />);

    await user.click(await screen.findByRole("button", { name: "Download PDF" }));

    await waitFor(() =>
      expect(mockedDownloadPdf).toHaveBeenCalledWith("biz-1", "po-1", "PO-20300801-001")
    );
  });

  it("surfaces a download failure without losing the purchase order", async () => {
    const user = userEvent.setup();
    resolveBusiness();
    mockedGetPurchaseOrder.mockResolvedValue(samplePurchaseOrder);
    mockedDownloadPdf.mockRejectedValue(new Error("Failed to download this purchase order."));

    render(<PurchaseOrderDetail purchaseOrderId="po-1" />);

    await user.click(await screen.findByRole("button", { name: "Download PDF" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Failed to download this purchase order.");
    expect(screen.getByRole("heading", { name: "PO-20300801-001" })).toBeInTheDocument();
  });

  it("shows an error with a way back to the list on failure", async () => {
    resolveBusiness();
    mockedGetPurchaseOrder.mockRejectedValue(new Error("Failed to load this purchase order."));

    render(<PurchaseOrderDetail purchaseOrderId="po-1" />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Failed to load this purchase order.");
    expect(screen.getByRole("link", { name: "Back to purchase orders" })).toHaveAttribute(
      "href",
      "/documents/purchase-orders"
    );
  });
});
