import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { acceptEstimate, declineEstimate, getHostedEstimate, hostedEstimatePdfUrl } from "../../lib/hostedEstimate";
import { HostedEstimateView } from "./HostedEstimateView";

vi.mock("../../lib/hostedEstimate", () => ({
  getHostedEstimate: vi.fn(),
  hostedEstimatePdfUrl: vi.fn((token: string) => `http://localhost:5094/api/v1/public/estimates/${token}/pdf`),
  acceptEstimate: vi.fn(),
  declineEstimate: vi.fn(),
}));

const mockedGetHostedEstimate = vi.mocked(getHostedEstimate);
const mockedAcceptEstimate = vi.mocked(acceptEstimate);
const mockedDeclineEstimate = vi.mocked(declineEstimate);

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

  it("shows Accept and Decline buttons while the estimate is Sent", async () => {
    mockedGetHostedEstimate.mockResolvedValue(SAMPLE);
    render(<HostedEstimateView token="qk6XMgWUVz9KbfJP" />);

    expect(await screen.findByRole("button", { name: "Accept" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Decline" })).toBeInTheDocument();
  });

  it("hides Accept and Decline once the estimate is already Accepted", async () => {
    mockedGetHostedEstimate.mockResolvedValue({ ...SAMPLE, status: "Accepted" });
    render(<HostedEstimateView token="qk6XMgWUVz9KbfJP" />);

    await screen.findByText("Acme Pty Ltd");
    expect(screen.queryByRole("button", { name: "Accept" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Decline" })).not.toBeInTheDocument();
    expect(screen.getByText("You accepted this estimate.")).toBeInTheDocument();
  });

  it("hides Accept and Decline once the estimate is already Declined", async () => {
    mockedGetHostedEstimate.mockResolvedValue({ ...SAMPLE, status: "Declined" });
    render(<HostedEstimateView token="qk6XMgWUVz9KbfJP" />);

    await screen.findByText("Acme Pty Ltd");
    expect(screen.queryByRole("button", { name: "Accept" })).not.toBeInTheDocument();
    expect(screen.getByText("You declined this estimate.")).toBeInTheDocument();
  });

  it("accepts the estimate and updates the status badge when Accept is clicked", async () => {
    mockedGetHostedEstimate.mockResolvedValue(SAMPLE);
    mockedAcceptEstimate.mockResolvedValue({ ...SAMPLE, status: "Accepted" });
    const user = userEvent.setup();
    render(<HostedEstimateView token="qk6XMgWUVz9KbfJP" />);

    await user.click(await screen.findByRole("button", { name: "Accept" }));

    expect(mockedAcceptEstimate).toHaveBeenCalledWith("qk6XMgWUVz9KbfJP");
    await waitFor(() => expect(screen.getByText("You accepted this estimate.")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Accept" })).not.toBeInTheDocument();
  });

  it("declines the estimate and updates the status badge when Decline is clicked", async () => {
    mockedGetHostedEstimate.mockResolvedValue(SAMPLE);
    mockedDeclineEstimate.mockResolvedValue({ ...SAMPLE, status: "Declined" });
    const user = userEvent.setup();
    render(<HostedEstimateView token="qk6XMgWUVz9KbfJP" />);

    await user.click(await screen.findByRole("button", { name: "Decline" }));

    expect(mockedDeclineEstimate).toHaveBeenCalledWith("qk6XMgWUVz9KbfJP");
    await waitFor(() => expect(screen.getByText("You declined this estimate.")).toBeInTheDocument());
  });

  it("shows an error and re-enables the buttons when accepting fails", async () => {
    mockedGetHostedEstimate.mockResolvedValue(SAMPLE);
    mockedAcceptEstimate.mockRejectedValue(new Error("This estimate has already been declined and can no longer be accepted."));
    const user = userEvent.setup();
    render(<HostedEstimateView token="qk6XMgWUVz9KbfJP" />);

    await user.click(await screen.findByRole("button", { name: "Accept" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("This estimate has already been declined and can no longer be accepted.");
    expect(screen.getByRole("button", { name: "Accept" })).not.toBeDisabled();
  });
});
