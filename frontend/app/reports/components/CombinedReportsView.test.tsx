import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getCombinedOutstanding,
  getCombinedOverdue,
  getCombinedRevenue,
  getCombinedTax,
  type CombinedInvoiceList,
  type CombinedRevenue,
  type CombinedTax,
} from "../../lib/combinedReports";
import { CombinedReportsView } from "./CombinedReportsView";

vi.mock("../../lib/combinedReports", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../lib/combinedReports")>()),
  getCombinedRevenue: vi.fn(),
  getCombinedOutstanding: vi.fn(),
  getCombinedOverdue: vi.fn(),
  getCombinedTax: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const mockedRevenue = vi.mocked(getCombinedRevenue);
const mockedOutstanding = vi.mocked(getCombinedOutstanding);
const mockedOverdue = vi.mocked(getCombinedOverdue);
const mockedTax = vi.mocked(getCombinedTax);

const revenue: CombinedRevenue = {
  periodType: "month",
  businesses: [
    { businessId: "aud", businessName: "Acme Pty Ltd", currency: "AUD", periods: [{ period: "2030-08", revenue: 1100 }], total: 1100 },
    { businessId: "usd", businessName: "Harbour Goods Inc", currency: "USD", periods: [{ period: "2030-08", revenue: 400 }], total: 400 },
  ],
  totalsByCurrency: [
    { currency: "AUD", total: 1100 },
    { currency: "USD", total: 400 },
  ],
};

const outstanding: CombinedInvoiceList = {
  businesses: [
    {
      businessId: "aud",
      businessName: "Acme Pty Ltd",
      invoices: [{ id: "i1", invoiceNumber: "INV-0001", customerName: "Client A", dueDate: "2030-09-01", currency: "AUD", amountDue: 1000, status: "Draft" }],
    },
    { businessId: "usd", businessName: "Harbour Goods Inc", invoices: [] },
  ],
  amountDueByCurrency: [{ currency: "AUD", amount: 1000 }],
};

const tax: CombinedTax = {
  businesses: [
    { businessId: "aud", businessName: "Acme Pty Ltd", summary: { currency: "AUD", totalTaxableAmount: 1000, totalTaxCollected: 100 } },
    { businessId: "usd", businessName: "Harbour Goods Inc", summary: { currency: "USD", totalTaxableAmount: 400, totalTaxCollected: 40 } },
  ],
  taxCollectedByCurrency: [
    { currency: "AUD", amount: 100 },
    { currency: "USD", amount: 40 },
  ],
};

describe("CombinedReportsView (IG-242)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedRevenue.mockResolvedValue(revenue);
    mockedOutstanding.mockResolvedValue(outstanding);
    mockedOverdue.mockResolvedValue({ businesses: [], amountDueByCurrency: [] });
    mockedTax.mockResolvedValue(tax);
  });

  it("attributes each business's figures to it, with its own currency", async () => {
    render(<CombinedReportsView />);

    expect((await screen.findAllByText("Harbour Goods Inc")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Acme Pty Ltd").length).toBeGreaterThan(0);
    expect(screen.getByText("INV-0001 · Client A")).toBeInTheDocument();
  });

  it("shows totals per currency and never a figure summed across currencies", async () => {
    render(<CombinedReportsView />);
    await screen.findAllByText("Harbour Goods Inc");

    // en-US formats AUD as "A$" and USD as "$".
    expect(screen.getAllByText("A$1,100.00").length).toBeGreaterThan(0);
    expect(screen.getAllByText("$400.00").length).toBeGreaterThan(0);
    expect(screen.queryByText("A$1,500.00")).not.toBeInTheDocument();
    expect(screen.queryByText("$1,500.00")).not.toBeInTheDocument();
  });

  it("says so when the user has no businesses", async () => {
    mockedRevenue.mockResolvedValue({ periodType: "month", businesses: [], totalsByCurrency: [] });
    mockedOutstanding.mockResolvedValue({ businesses: [], amountDueByCurrency: [] });
    mockedOverdue.mockResolvedValue({ businesses: [], amountDueByCurrency: [] });
    mockedTax.mockResolvedValue({ businesses: [], taxCollectedByCurrency: [] });

    render(<CombinedReportsView />);

    expect(await screen.findByText("You don't have any businesses yet.")).toBeInTheDocument();
  });

  it("shows an error when the combined reports cannot be loaded", async () => {
    mockedRevenue.mockRejectedValue(new Error("Failed to load the combined reports."));

    render(<CombinedReportsView />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Failed to load the combined reports.");
  });
});
