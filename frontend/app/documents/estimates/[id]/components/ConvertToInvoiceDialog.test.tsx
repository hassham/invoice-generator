import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import * as estimateModule from "../../../../lib/estimate";
import { ConvertToInvoiceDialog } from "./ConvertToInvoiceDialog";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("../../../../lib/estimate", () => ({
  convertEstimateToInvoice: vi.fn(),
}));

const mockedConvertEstimateToInvoice = vi.mocked(estimateModule.convertEstimateToInvoice);

describe("ConvertToInvoiceDialog", () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("displays the dialog with estimate number and confirmation message", () => {
    render(
      <ConvertToInvoiceDialog
        estimateId="estimate-123"
        estimateNumber="EST-001"
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText("Convert Estimate to Invoice?")).toBeInTheDocument();
    expect(screen.getByText(/EST-001/)).toBeInTheDocument();
    expect(screen.getByText(/will create a new invoice/)).toBeInTheDocument();
  });

  it("has Cancel and Convert buttons", () => {
    render(
      <ConvertToInvoiceDialog
        estimateId="estimate-123"
        estimateNumber="EST-001"
        onClose={mockOnClose}
      />
    );

    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Convert" })).toBeInTheDocument();
  });

  it("closes the dialog when Cancel is clicked", async () => {
    const user = userEvent.setup();
    render(
      <ConvertToInvoiceDialog
        estimateId="estimate-123"
        estimateNumber="EST-001"
        onClose={mockOnClose}
      />
    );

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("calls convertEstimateToInvoice when Convert is clicked", async () => {
    mockedConvertEstimateToInvoice.mockResolvedValue("invoice-456");
    const user = userEvent.setup();
    render(
      <ConvertToInvoiceDialog
        estimateId="estimate-123"
        estimateNumber="EST-001"
        onClose={mockOnClose}
      />
    );

    await user.click(screen.getByRole("button", { name: "Convert" }));

    expect(mockedConvertEstimateToInvoice).toHaveBeenCalledWith("estimate-123");
  });

  it("disables buttons while converting", async () => {
    mockedConvertEstimateToInvoice.mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );
    const user = userEvent.setup();
    render(
      <ConvertToInvoiceDialog
        estimateId="estimate-123"
        estimateNumber="EST-001"
        onClose={mockOnClose}
      />
    );

    await user.click(screen.getByRole("button", { name: "Convert" }));

    expect(screen.getByRole("button", { name: /Converting/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });

  it("shows an error message when conversion fails", async () => {
    mockedConvertEstimateToInvoice.mockRejectedValue(
      new Error("Only accepted estimates can be converted to invoices.")
    );
    const user = userEvent.setup();
    render(
      <ConvertToInvoiceDialog
        estimateId="estimate-123"
        estimateNumber="EST-001"
        onClose={mockOnClose}
      />
    );

    await user.click(screen.getByRole("button", { name: "Convert" }));

    expect(
      await screen.findByRole("alert")
    ).toHaveTextContent("Only accepted estimates can be converted to invoices.");
  });
});
