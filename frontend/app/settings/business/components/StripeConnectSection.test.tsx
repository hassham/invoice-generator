import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { disconnectStripe, stripeConnectUrl, type BusinessProfile } from "../../../lib/business";
import { StripeConnectSection } from "./StripeConnectSection";

vi.mock("../../../lib/business", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../lib/business")>()),
  disconnectStripe: vi.fn(),
}));

const mockedDisconnectStripe = vi.mocked(disconnectStripe);

const CONNECTED_PROFILE = { stripeAccountId: "acct_after_disconnect" } as BusinessProfile;

describe("StripeConnectSection", () => {
  it("shows a Connect with Stripe link, pointing at the backend's connect endpoint, when not connected", () => {
    render(<StripeConnectSection stripeAccountId={null} onChange={vi.fn()} />);

    const link = screen.getByRole("link", { name: "Connect with Stripe" });
    expect(link).toHaveAttribute("href", stripeConnectUrl());
    expect(screen.queryByText("Connected")).not.toBeInTheDocument();
  });

  it("shows the connected account id and a Disconnect button when connected", () => {
    render(<StripeConnectSection stripeAccountId="acct_123" onChange={vi.fn()} />);

    expect(screen.getByText("Connected")).toBeInTheDocument();
    expect(screen.getByText("acct_123")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Disconnect" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Connect with Stripe" })).not.toBeInTheDocument();
  });

  it("disconnects and calls onChange with the updated profile", async () => {
    mockedDisconnectStripe.mockResolvedValue(CONNECTED_PROFILE);
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<StripeConnectSection stripeAccountId="acct_123" onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Disconnect" }));

    expect(onChange).toHaveBeenCalledWith(CONNECTED_PROFILE);
  });

  it("shows an error and does not call onChange when disconnecting fails", async () => {
    mockedDisconnectStripe.mockRejectedValue(new Error("Failed to disconnect Stripe."));
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<StripeConnectSection stripeAccountId="acct_123" onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Disconnect" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Failed to disconnect Stripe.");
    expect(onChange).not.toHaveBeenCalled();
  });
});
