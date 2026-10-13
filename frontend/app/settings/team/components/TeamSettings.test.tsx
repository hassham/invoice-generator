import { render, screen, waitFor, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getActiveBusinessId } from "../../../lib/business";
import {
  cancelInvitation,
  changeMemberRole,
  getTeam,
  inviteMember,
  removeMember,
  TeamApiError,
  type TeamSnapshot,
} from "../../../lib/teamInvitations";
import { TeamSettings } from "./TeamSettings";

vi.mock("../../../lib/business", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../lib/business")>()),
  getActiveBusinessId: vi.fn(),
}));

vi.mock("../../../lib/teamInvitations", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../lib/teamInvitations")>()),
  getTeam: vi.fn(),
  inviteMember: vi.fn(),
  changeMemberRole: vi.fn(),
  cancelInvitation: vi.fn(),
  removeMember: vi.fn(),
}));

const mockedGetActiveBusinessId = vi.mocked(getActiveBusinessId);
const mockedGetTeam = vi.mocked(getTeam);
const mockedInviteMember = vi.mocked(inviteMember);
const mockedChangeMemberRole = vi.mocked(changeMemberRole);
const mockedCancelInvitation = vi.mocked(cancelInvitation);
const mockedRemoveMember = vi.mocked(removeMember);

const team: TeamSnapshot = {
  pendingInvitations: [
    { id: "inv-1", email: "pending@example.com", role: "Restricted", createdAt: "2026-10-01T00:00:00Z", expiresAt: "2026-10-08T00:00:00Z" },
  ],
  members: [{ id: "mem-1", userId: "user-2", email: "member@example.com", role: "Restricted", joinedAt: "2026-09-01T00:00:00Z" }],
};

describe("TeamSettings (IG-239 / IG-297 / IG-298 / IG-240)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetActiveBusinessId.mockResolvedValue("biz-1");
    mockedGetTeam.mockResolvedValue(team);
  });

  it("lists pending invitations and current members, with their roles", async () => {
    render(<TeamSettings />);

    expect(await screen.findByText("pending@example.com")).toBeInTheDocument();
    expect(screen.getByText("member@example.com")).toBeInTheDocument();
    expect(screen.getAllByText(/Restricted \(no payment settings\)/).length).toBeGreaterThan(0);
  });

  it("invites as Restricted by default and reloads the team", async () => {
    mockedInviteMember.mockResolvedValue({ id: "inv-2", email: "new@example.com", role: "Restricted", createdAt: "", expiresAt: "" });
    const user = userEvent.setup();
    render(<TeamSettings />);
    await screen.findByText("pending@example.com");

    await user.type(screen.getByLabelText("Email address"), "new@example.com");
    await user.click(screen.getByRole("button", { name: "Send invitation" }));

    await waitFor(() => expect(mockedInviteMember).toHaveBeenCalledWith("biz-1", "new@example.com", "Restricted"));
    expect(await screen.findByText("Invitation sent to new@example.com as Restricted.")).toBeInTheDocument();
    expect(mockedGetTeam).toHaveBeenCalledTimes(2);
  });

  it("invites as Admin when the owner chooses it", async () => {
    mockedInviteMember.mockResolvedValue({ id: "inv-3", email: "boss@example.com", role: "Admin", createdAt: "", expiresAt: "" });
    const user = userEvent.setup();
    render(<TeamSettings />);
    await screen.findByText("pending@example.com");

    await user.type(screen.getByLabelText("Email address"), "boss@example.com");
    await user.selectOptions(screen.getByLabelText("Role"), "Admin");
    await user.click(screen.getByRole("button", { name: "Send invitation" }));

    await waitFor(() => expect(mockedInviteMember).toHaveBeenCalledWith("biz-1", "boss@example.com", "Admin"));
  });

  it("shows the server's refusal when an invitation is rejected", async () => {
    mockedInviteMember.mockRejectedValue(new TeamApiError("This email address already has a pending invitation.", 409));
    const user = userEvent.setup();
    render(<TeamSettings />);
    await screen.findByText("pending@example.com");

    await user.type(screen.getByLabelText("Email address"), "pending@example.com");
    await user.click(screen.getByRole("button", { name: "Send invitation" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("This email address already has a pending invitation.");
  });

  it("changes a member's role from the member row", async () => {
    mockedChangeMemberRole.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<TeamSettings />);
    const member = (await screen.findByText("member@example.com")).closest("li") as HTMLElement;

    await user.selectOptions(within(member).getByLabelText("Role for member@example.com"), "Admin");

    await waitFor(() => expect(mockedChangeMemberRole).toHaveBeenCalledWith("biz-1", "mem-1", "Admin"));
  });

  it("cancels a pending invitation", async () => {
    mockedCancelInvitation.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<TeamSettings />);
    const pending = (await screen.findByText("pending@example.com")).closest("li") as HTMLElement;

    await user.click(within(pending).getByRole("button", { name: "Cancel invitation" }));

    await waitFor(() => expect(mockedCancelInvitation).toHaveBeenCalledWith("biz-1", "inv-1"));
  });

  it("removes a member's access", async () => {
    mockedRemoveMember.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<TeamSettings />);
    const member = (await screen.findByText("member@example.com")).closest("li") as HTMLElement;

    await user.click(within(member).getByRole("button", { name: "Remove access" }));

    await waitFor(() => expect(mockedRemoveMember).toHaveBeenCalledWith("biz-1", "mem-1"));
  });

  it("tells a team member the team is owner-managed instead of showing an empty form", async () => {
    mockedGetTeam.mockRejectedValue(new TeamApiError("Only the business owner can manage the team.", 403));
    render(<TeamSettings />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Only the business owner can manage the team.");
    expect(screen.queryByRole("button", { name: "Send invitation" })).not.toBeInTheDocument();
  });
});
