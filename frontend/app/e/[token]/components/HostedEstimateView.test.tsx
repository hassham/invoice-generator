import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getHostedEstimate, hostedEstimatePdfUrl } from "../../lib/hostedEstimate";
import { HostedEstimateView } from "./HostedEstimateView";

vi.mock("../../lib/hostedEstimate", () => ({
  getHostedEstimate: vi.fn(),
  hostedEstimatePdfUrl: vi.fn((token: string) => `http://localhost:5094/api/v1/public/estimates/${token}/pdf`),
}));

const mockedGetHostedEstimate = vi.mocked(getHostedEstimate);

const SAMPLE = {
  businessName: "Acme Pty Ltd",
  logoUrl: "/api/v1/business/logo/business-1",
  estimateNumber: "EST-000123",
  status: "Sent",
  issueDate: "2026-09-01",
  expiryDate: "2026-09-15",
  currency: "AUD",
  totalAmount: 220,
};

describe("HostedEstimateView", () => {
  it("shows a loading state before the fetch resolves", () => {
    mockedGetHostedEstimate.mockReturnValue(new Promise(() => {}));
    render(<HostedEstimateView token="qk6XMgWUVz9KbfJP" />);

    expect(screen.getByText(/Loading estimate/)).toBeInTheDocument();
  });

  it("shows the business name, estimate number, total and status once loaded", async () => {
    mockedGetHostedEstimate.mockResolvedValue(SAMPLE);
    render(<HostedEstimateView token="qk6XMgWUVz9KbfJP" />);

    expect(await screen.findByText("Acme Pty Ltd")).toBeInTheDocument();
    expect(screen.getByText("EST-000123")).toBeInTheDocument();
    expect(screen.getByText("AUD 220.00")).toBeInTheDocument();
    expect(screen.getByText("Sent")).toBeInTheDocument();
  });

  it("links Download PDF to the token's PDF endpoint", async () => {
    mockedGetHostedEstimate.mockResolvedValue(SAMPLE);
    render(<HostedEstimateView token="qk6XMgWUVz9KbfJP" />);

    const link = await screen.findByRole("link", { name: "Download PDF" });
    expect(link).toHaveAttribute("href", hostedEstimatePdfUrl("qk6XMgWUVz9KbfJP"));
  });

  it("shows a generic not-found message on failure", async () => {
    mockedGetHostedEstimate.mockRejectedValue(new Error("This estimate could not be found. The link may be incorrect or the estimate may no longer be available."));
    render(<HostedEstimateView token="does-not-exist" />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/could not be found/);
  });

  it("renders without a logo when none is set", async () => {
    mockedGetHostedEstimate.mockResolvedValue({ ...SAMPLE, logoUrl: null });
    render(<HostedEstimateView token="qk6XMgWUVz9KbfJP" />);

    await screen.findByText("Acme Pty Ltd");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
