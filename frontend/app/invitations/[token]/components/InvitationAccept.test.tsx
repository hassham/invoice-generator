import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { setSelectedBusinessId } from "../../../lib/business";
import { acceptInvitation, getInvitation, TeamApiError } from "../../../lib/teamInvitations";
import { InvitationAccept } from "./InvitationAccept";

vi.mock("../../../lib/business", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../lib/business")>()),
  setSelectedBusinessId: vi.fn(),
}));

vi.mock("../../../lib/teamInvitations", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../lib/teamInvitations")>()),
  getInvitation: vi.fn(),
  acceptInvitation: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const mockedGetInvitation = vi.mocked(getInvitation);
const mockedAcceptInvitation = vi.mocked(acceptInvitation);
const mockedSetSelectedBusinessId = vi.mocked(setSelectedBusinessId);

const preview = { businessId: "biz-9", businessName: "Acme Pty Ltd", email: "invitee@example.com", expiresAt: "2026-10-20T00:00:00Z" };

describe("InvitationAccept (IG-297 / IG-298)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the business and accepts, then selects that business", async () => {
    mockedGetInvitation.mockResolvedValue(preview);
    mockedAcceptInvitation.mockResolvedValue(preview);
    const user = userEvent.setup();
    render(<InvitationAccept token="tok-1" />);

    await user.click(await screen.findByRole("button", { name: "Accept invitation" }));

    await waitFor(() => expect(mockedAcceptInvitation).toHaveBeenCalledWith("tok-1"));
    expect(mockedSetSelectedBusinessId).toHaveBeenCalledWith("biz-9");
    expect(await screen.findByText("You've joined Acme Pty Ltd")).toBeInTheDocument();
  });

  it("asks a signed-out visitor to sign in or create an account", async () => {
    mockedGetInvitation.mockRejectedValue(new TeamApiError("Unauthorized.", 401));
    render(<InvitationAccept token="tok-2" />);

    expect(await screen.findByRole("heading", { name: "Sign in to accept this invitation" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create an account" })).toHaveAttribute("href", "/signup");
  });

  it("explains when the invitation was sent to a different email address", async () => {
    mockedGetInvitation.mockRejectedValue(
      new TeamApiError("This invitation was sent to a different email address. Sign in with that address to accept it.", 403),
    );
    render(<InvitationAccept token="tok-3" />);

    expect(await screen.findByRole("alert")).toHaveTextContent("sent to a different email address");
    expect(screen.queryByRole("button", { name: "Accept invitation" })).not.toBeInTheDocument();
  });

  it("shows an expired invitation's reason and does not offer to accept", async () => {
    mockedGetInvitation.mockRejectedValue(new TeamApiError("This invitation has expired. Ask the business owner to send a new one.", 409));
    render(<InvitationAccept token="tok-4" />);

    expect(await screen.findByText("This invitation has expired. Ask the business owner to send a new one.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Accept invitation" })).not.toBeInTheDocument();
  });
});
