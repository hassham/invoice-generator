import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getBusinessProfile } from "../../../lib/business";
import { listPurchaseOrders } from "../../../lib/purchaseOrders";
import { PurchaseOrderListView } from "./PurchaseOrderListView";

vi.mock("../../../lib/business", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../lib/business")>()),
  getBusinessProfile: vi.fn(),
}));

vi.mock("../../../lib/purchaseOrders", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../lib/purchaseOrders")>()),
  listPurchaseOrders: vi.fn(),
}));

const mockedGetBusinessProfile = vi.mocked(getBusinessProfile);
const mockedListPurchaseOrders = vi.mocked(listPurchaseOrders);

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
  notes: null,
  terms: null,
  deliveryInstructions: null,
  items: [],
  createdAt: "2030-08-01T00:00:00Z",
  updatedAt: "2030-08-01T00:00:00Z",
};

function resolveBusiness() {
  mockedGetBusinessProfile.mockResolvedValue({ id: "biz-1" } as Awaited<ReturnType<typeof getBusinessProfile>>);
}

describe("PurchaseOrderListView", () => {
  it("shows a loading state before the fetch resolves", () => {
    resolveBusiness();
    mockedListPurchaseOrders.mockReturnValue(new Promise(() => {}));

    render(<PurchaseOrderListView />);

    expect(screen.getByText(/Loading purchase orders/)).toBeInTheDocument();
  });

  it("renders each purchase order's number, supplier and total once loaded", async () => {
    resolveBusiness();
    mockedListPurchaseOrders.mockResolvedValue([samplePurchaseOrder]);

    render(<PurchaseOrderListView />);

    expect(await screen.findByRole("link", { name: "PO-20300801-001" })).toHaveAttribute(
      "href",
      "/documents/purchase-orders/po-1"
    );
    expect(screen.getByText("Bolt Supply Co")).toBeInTheDocument();
    expect(screen.getByText("AUD 220.00")).toBeInTheDocument();
  });

  // IG-292's AC: distinguishable from an invoice/estimate, not merely present.
  it("labels every row with its document type", async () => {
    resolveBusiness();
    mockedListPurchaseOrders.mockResolvedValue([samplePurchaseOrder]);

    render(<PurchaseOrderListView />);

    expect(await screen.findByText("Purchase Order")).toBeInTheDocument();
  });

  it("identifies the counterparty as a supplier rather than a customer", async () => {
    resolveBusiness();
    mockedListPurchaseOrders.mockResolvedValue([samplePurchaseOrder]);

    render(<PurchaseOrderListView />);

    expect(await screen.findByRole("columnheader", { name: "Supplier" })).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Customer" })).not.toBeInTheDocument();
  });

  it("shows an empty state when there are no purchase orders yet", async () => {
    resolveBusiness();
    mockedListPurchaseOrders.mockResolvedValue([]);

    render(<PurchaseOrderListView />);

    expect(await screen.findByText(/No purchase orders yet\./)).toBeInTheDocument();
  });

  // IG-307: the list is the only entry point to the create flow, so the action has to be here
  // whether or not the account already has purchase orders.
  it("offers a create action alongside the list", async () => {
    resolveBusiness();
    mockedListPurchaseOrders.mockResolvedValue([samplePurchaseOrder]);

    render(<PurchaseOrderListView />);

    expect(await screen.findByRole("link", { name: "New purchase order" })).toHaveAttribute(
      "href",
      "/documents/purchase-orders/new"
    );
  });

  it("offers a create action from the empty state too", async () => {
    resolveBusiness();
    mockedListPurchaseOrders.mockResolvedValue([]);

    render(<PurchaseOrderListView />);

    expect(await screen.findByRole("link", { name: "Raise your first purchase order" })).toHaveAttribute(
      "href",
      "/documents/purchase-orders/new"
    );
  });

  it("shows an error message on failure", async () => {
    resolveBusiness();
    mockedListPurchaseOrders.mockRejectedValue(new Error("Failed to load your purchase orders."));

    render(<PurchaseOrderListView />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Failed to load your purchase orders.");
  });

  it("surfaces an error when the business profile cannot be resolved", async () => {
    mockedGetBusinessProfile.mockRejectedValue(new Error("Failed to load your business profile."));

    render(<PurchaseOrderListView />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Failed to load your business profile.");
  });
});
