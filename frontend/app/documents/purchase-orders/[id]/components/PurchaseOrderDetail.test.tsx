import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getBusinessProfile } from "../../../../lib/business";
import { getPurchaseOrder } from "../../../../lib/purchaseOrders";
import { PurchaseOrderDetail } from "./PurchaseOrderDetail";

vi.mock("../../../../lib/business", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../../lib/business")>()),
  getBusinessProfile: vi.fn(),
}));

vi.mock("../../../../lib/purchaseOrders", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../../lib/purchaseOrders")>()),
  getPurchaseOrder: vi.fn(),
}));

const mockedGetBusinessProfile = vi.mocked(getBusinessProfile);
const mockedGetPurchaseOrder = vi.mocked(getPurchaseOrder);

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
    expect(screen.getByText("AUD 220.00")).toBeInTheDocument();
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
