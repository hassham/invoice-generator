import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getBusinessProfile } from "../../../../lib/business";
import { listCustomers } from "../../../../lib/customers";
import { createPurchaseOrder } from "../../../../lib/purchaseOrders";
import { todayIsoDate } from "../lib/purchaseOrderDraft";
import { CreatePurchaseOrderForm } from "./CreatePurchaseOrderForm";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("../../../../lib/business", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../../lib/business")>()),
  getBusinessProfile: vi.fn(),
}));

vi.mock("../../../../lib/customers", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../../lib/customers")>()),
  listCustomers: vi.fn(),
}));

vi.mock("../../../../lib/purchaseOrders", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../../lib/purchaseOrders")>()),
  createPurchaseOrder: vi.fn(),
}));

const mockedGetBusinessProfile = vi.mocked(getBusinessProfile);
const mockedListCustomers = vi.mocked(listCustomers);
const mockedCreatePurchaseOrder = vi.mocked(createPurchaseOrder);

const supplier = {
  id: "sup-1",
  businessName: "Bolt Supply Co",
  contactName: "Dana Reed",
} as Awaited<ReturnType<typeof listCustomers>>[number];

function resolveBootstrap(customers = [supplier]) {
  mockedGetBusinessProfile.mockResolvedValue({
    id: "biz-1",
    defaultCurrency: "AUD",
    defaultTaxRate: 10,
  } as Awaited<ReturnType<typeof getBusinessProfile>>);
  mockedListCustomers.mockResolvedValue(customers);
}

/** Fills the minimum a valid purchase order needs: supplier, required-by date and one line. */
async function fillValidOrder(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(screen.getByLabelText(/^Supplier/), "sup-1");
  fireEvent.change(screen.getByLabelText(/^Required by/), { target: { value: "2030-08-15" } });
  await user.type(screen.getByLabelText(/^Description/), "Steel bolts");
  await user.clear(screen.getByLabelText(/^Unit Price/));
  await user.type(screen.getByLabelText(/^Unit Price/), "100");
}

describe("CreatePurchaseOrderForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a loading state until the business profile and suppliers resolve", () => {
    mockedGetBusinessProfile.mockReturnValue(new Promise(() => {}));
    mockedListCustomers.mockReturnValue(new Promise(() => {}));

    render(<CreatePurchaseOrderForm />);

    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("labels the document type and the counterparty as a supplier", async () => {
    resolveBootstrap();

    render(<CreatePurchaseOrderForm />);

    expect(await screen.findByRole("heading", { name: "New Purchase Order" })).toBeInTheDocument();
    expect(screen.getByLabelText(/^Supplier/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Customer/)).not.toBeInTheDocument();
  });

  it("prefills the currency and today's date from the business profile", async () => {
    resolveBootstrap();

    render(<CreatePurchaseOrderForm />);

    expect(await screen.findByLabelText(/^Currency/)).toHaveValue("AUD");
    // Built from local date parts, not toISOString(): the form uses the user's local today, and a
    // UTC expectation here would fail every evening in any timezone ahead of UTC.
    expect(screen.getByLabelText(/^Issue date/)).toHaveValue(todayIsoDate());
  });

  it("creates the purchase order and lands on it", async () => {
    resolveBootstrap();
    mockedCreatePurchaseOrder.mockResolvedValue({ id: "po-9" } as Awaited<ReturnType<typeof createPurchaseOrder>>);
    const user = userEvent.setup();

    render(<CreatePurchaseOrderForm />);
    await screen.findByRole("heading", { name: "New Purchase Order" });
    await fillValidOrder(user);
    await user.click(screen.getByRole("button", { name: "Create purchase order" }));

    await waitFor(() => {
      expect(mockedCreatePurchaseOrder).toHaveBeenCalledTimes(1);
    });

    const [businessId, request] = mockedCreatePurchaseOrder.mock.calls[0];
    expect(businessId).toBe("biz-1");
    expect(request.supplierId).toBe("sup-1");
    expect(request.dueDate).toBe("2030-08-15");
    expect(request.currency).toBe("AUD");
    expect(request.items).toEqual([
      { description: "Steel bolts", quantity: 1, unit: null, unitPrice: 100, taxRate: 10, discount: 0 },
    ]);

    // IG-307's completion criterion.
    expect(pushMock).toHaveBeenCalledWith("/documents/purchase-orders/po-9");
  });

  it("does not submit when the supplier is missing, and says why", async () => {
    resolveBootstrap();
    const user = userEvent.setup();

    render(<CreatePurchaseOrderForm />);
    await screen.findByRole("heading", { name: "New Purchase Order" });
    fireEvent.change(screen.getByLabelText(/^Required by/), { target: { value: "2030-08-15" } });
    await user.type(screen.getByLabelText(/^Description/), "Steel bolts");
    await user.type(screen.getByLabelText(/^Unit Price/), "100");
    await user.click(screen.getByRole("button", { name: "Create purchase order" }));

    expect(await screen.findByText("Choose the supplier this order is going to.")).toBeInTheDocument();
    expect(mockedCreatePurchaseOrder).not.toHaveBeenCalled();
  });

  it("does not submit a required-by date earlier than the issue date", async () => {
    resolveBootstrap();
    const user = userEvent.setup();

    render(<CreatePurchaseOrderForm />);
    await screen.findByRole("heading", { name: "New Purchase Order" });
    await user.selectOptions(screen.getByLabelText(/^Supplier/), "sup-1");
    fireEvent.change(screen.getByLabelText(/^Issue date/), { target: { value: "2030-08-10" } });
    fireEvent.change(screen.getByLabelText(/^Required by/), { target: { value: "2030-08-09" } });
    await user.type(screen.getByLabelText(/^Description/), "Steel bolts");
    await user.type(screen.getByLabelText(/^Unit Price/), "100");
    await user.click(screen.getByRole("button", { name: "Create purchase order" }));

    expect(
      await screen.findByText("Required by date cannot be before the issue date.")
    ).toBeInTheDocument();
    expect(mockedCreatePurchaseOrder).not.toHaveBeenCalled();
  });

  it("does not submit a line with no description", async () => {
    resolveBootstrap();
    const user = userEvent.setup();

    render(<CreatePurchaseOrderForm />);
    await screen.findByRole("heading", { name: "New Purchase Order" });
    await user.selectOptions(screen.getByLabelText(/^Supplier/), "sup-1");
    fireEvent.change(screen.getByLabelText(/^Required by/), { target: { value: "2030-08-15" } });
    await user.type(screen.getByLabelText(/^Unit Price/), "100");
    await user.click(screen.getByRole("button", { name: "Create purchase order" }));

    expect(await screen.findByText("Description is required.")).toBeInTheDocument();
    expect(mockedCreatePurchaseOrder).not.toHaveBeenCalled();
  });

  it("previews the total the backend will calculate", async () => {
    resolveBootstrap();
    const user = userEvent.setup();

    render(<CreatePurchaseOrderForm />);
    await screen.findByRole("heading", { name: "New Purchase Order" });
    await user.clear(screen.getByLabelText(/^Quantity/));
    await user.type(screen.getByLabelText(/^Quantity/), "2");
    await user.type(screen.getByLabelText(/^Unit Price/), "100");

    // 2 x 100 at the business's default 10% tax rate.
    const totalRow = screen.getByText("Total").closest("div");
    await waitFor(() => {
      expect(totalRow).toHaveTextContent("AUD 220.00");
    });
  });

  it("shows a server error and allows a retry without losing the entered order", async () => {
    resolveBootstrap();
    mockedCreatePurchaseOrder.mockRejectedValueOnce(new Error("Supplier not found."));
    const user = userEvent.setup();

    render(<CreatePurchaseOrderForm />);
    await screen.findByRole("heading", { name: "New Purchase Order" });
    await fillValidOrder(user);
    await user.click(screen.getByRole("button", { name: "Create purchase order" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Supplier not found.");
    expect(screen.getByLabelText(/^Description/)).toHaveValue("Steel bolts");

    mockedCreatePurchaseOrder.mockResolvedValue({ id: "po-9" } as Awaited<ReturnType<typeof createPurchaseOrder>>);
    await user.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/documents/purchase-orders/po-9");
    });
  });

  // The backend requires a real SupplierId, so with no customer records the form cannot succeed -
  // better to say so than to let the user fill it in and fail at submit.
  it("explains what to do when the account has no suppliers yet", async () => {
    resolveBootstrap([]);

    render(<CreatePurchaseOrderForm />);

    expect(await screen.findByRole("link", { name: "Add a supplier" })).toHaveAttribute(
      "href",
      "/customers/new"
    );
    expect(screen.getByRole("button", { name: "Create purchase order" })).toBeDisabled();
  });

  it("surfaces a failure to load the business profile", async () => {
    mockedGetBusinessProfile.mockRejectedValue(new Error("Failed to load your business profile."));
    mockedListCustomers.mockResolvedValue([supplier]);

    render(<CreatePurchaseOrderForm />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Failed to load your business profile.");
  });
});
