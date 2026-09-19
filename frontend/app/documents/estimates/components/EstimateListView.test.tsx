import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { listEstimates } from "../../../lib/estimate";
import { EstimateListView } from "./EstimateListView";

vi.mock("../../../lib/estimate", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../lib/estimate")>()),
  listEstimates: vi.fn(),
}));

const mockedListEstimates = vi.mocked(listEstimates);

const sampleItem = {
  id: "est-1",
  estimateNumber: "EST-0001",
  customerName: "Acme Pty Ltd",
  status: "Draft",
  issueDate: "2026-09-01",
  expiryDate: "2026-09-15",
  currency: "AUD",
  totalAmount: 220,
};

describe("EstimateListView", () => {
  it("shows a loading state before the fetch resolves", () => {
    mockedListEstimates.mockReturnValue(new Promise(() => {}));

    render(<EstimateListView />);

    expect(screen.getByText(/Loading estimates/)).toBeInTheDocument();
  });

  it("renders each estimate's number, customer, status and total once loaded", async () => {
    mockedListEstimates.mockResolvedValue({ items: [sampleItem], page: 1, pageSize: 25, totalCount: 1 });

    render(<EstimateListView />);

    expect(await screen.findByRole("link", { name: "EST-0001" })).toHaveAttribute("href", "/documents/estimates/est-1");
    expect(screen.getByText("Acme Pty Ltd")).toBeInTheDocument();
    expect(screen.getByText("Draft")).toBeInTheDocument();
    expect(screen.getByText("AUD 220.00")).toBeInTheDocument();
  });

  it("shows an empty state when there are no estimates yet", async () => {
    mockedListEstimates.mockResolvedValue({ items: [], page: 1, pageSize: 25, totalCount: 0 });

    render(<EstimateListView />);

    expect(await screen.findByText("No estimates yet.")).toBeInTheDocument();
  });

  it("shows a generic error message on failure", async () => {
    mockedListEstimates.mockRejectedValue(new Error("Failed to load your estimates."));

    render(<EstimateListView />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Failed to load your estimates.");
  });

  it("links New Estimate to the create page", async () => {
    mockedListEstimates.mockResolvedValue({ items: [], page: 1, pageSize: 25, totalCount: 0 });

    render(<EstimateListView />);

    expect(await screen.findByRole("link", { name: "New Estimate" })).toHaveAttribute("href", "/estimate/create");
  });
});
