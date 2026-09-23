import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { RevenueByCustomerView } from "./RevenueByCustomerView";
import * as dashboardLib from "../../lib/dashboard";

vi.mock("../../lib/dashboard");

describe("RevenueByCustomerView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state initially", () => {
    vi.mocked(dashboardLib.getRevenueByCustomer).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<RevenueByCustomerView />);
    expect(screen.getByText("Loading revenue by customer...")).toBeInTheDocument();
  });

  it("displays revenue by customer", async () => {
    const mockData = [
      { customerId: "cust-1", customerName: "Acme Corp", currency: "USD", revenue: 5000 },
      { customerId: "cust-2", customerName: "Tech Startup", currency: "USD", revenue: 3500 },
      { customerId: "cust-3", customerName: "Silent Inc", currency: "USD", revenue: 0 },
    ];

    vi.mocked(dashboardLib.getRevenueByCustomer).mockResolvedValue(mockData);

    render(<RevenueByCustomerView />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
      expect(screen.getByText("Tech Startup")).toBeInTheDocument();
      expect(screen.getByText("Silent Inc")).toBeInTheDocument();
    });

    expect(screen.getByText("$5,000.00")).toBeInTheDocument();
    expect(screen.getByText("$3,500.00")).toBeInTheDocument();
    expect(screen.getByText("$0.00")).toBeInTheDocument(); // Silent Inc revenue
  });

  it("displays total revenue sum", async () => {
    const mockData = [
      { customerId: "cust-1", customerName: "Customer A", currency: "AUD", revenue: 1000 },
      { customerId: "cust-2", customerName: "Customer B", currency: "AUD", revenue: 2000 },
    ];

    vi.mocked(dashboardLib.getRevenueByCustomer).mockResolvedValue(mockData);

    render(<RevenueByCustomerView />);

    await waitFor(() => {
      expect(screen.getByText("Total Revenue")).toBeInTheDocument();
      expect(screen.getByText("A$3,000.00")).toBeInTheDocument();
    });
  });

  it("displays empty state when no customers", async () => {
    vi.mocked(dashboardLib.getRevenueByCustomer).mockResolvedValue([]);

    render(<RevenueByCustomerView />);

    await waitFor(() => {
      expect(screen.getByText("No customers have invoices yet")).toBeInTheDocument();
    });
  });

  it("displays error message on fetch failure", async () => {
    vi.mocked(dashboardLib.getRevenueByCustomer).mockRejectedValue(new Error("API error"));

    render(<RevenueByCustomerView />);

    await waitFor(() => {
      expect(screen.getByText(/Error: API error/)).toBeInTheDocument();
    });
  });

  it("displays customer data correctly", async () => {
    const mockData = [
      { customerId: "cust-1", customerName: "High Revenue", currency: "USD", revenue: 5000 },
      { customerId: "cust-2", customerName: "Mid Revenue", currency: "USD", revenue: 2000 },
      { customerId: "cust-3", customerName: "Low Revenue", currency: "USD", revenue: 100 },
    ];

    vi.mocked(dashboardLib.getRevenueByCustomer).mockResolvedValue(mockData);

    render(<RevenueByCustomerView />);

    await waitFor(() => {
      expect(screen.getByText("High Revenue")).toBeInTheDocument();
      expect(screen.getByText("Mid Revenue")).toBeInTheDocument();
      expect(screen.getByText("Low Revenue")).toBeInTheDocument();
      expect(screen.getByText("$5,000.00")).toBeInTheDocument();
      expect(screen.getByText("$2,000.00")).toBeInTheDocument();
      expect(screen.getByText("$100.00")).toBeInTheDocument();
    });
  });
});
