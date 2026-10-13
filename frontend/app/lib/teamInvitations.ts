import { apiBaseUrl } from "./business";

/** IG-239 / IG-297 / IG-298 / IG-240: client for team invitations, membership and roles. Team
 * management is owner-only; the server returns 403 to a team member, which the page shows as a plain
 * message. Restricted members cannot change payment settings; the server enforces that, not the UI. */

/** Restricted: works in the business but cannot change payment settings. Admin: also can. */
export type BusinessRole = "Restricted" | "Admin";

export const BUSINESS_ROLE_LABELS: Record<BusinessRole, string> = {
  Restricted: "Restricted (no payment settings)",
  Admin: "Admin (can change payment settings)",
};

export interface PendingInvitation {
  id: string;
  email: string;
  role: BusinessRole;
  createdAt: string;
  expiresAt: string;
}

export interface TeamMember {
  id: string;
  userId: string;
  email: string;
  role: BusinessRole;
  joinedAt: string;
}

export interface TeamSnapshot {
  pendingInvitations: PendingInvitation[];
  members: TeamMember[];
}

/** What an invitee sees before and after accepting. */
export interface InvitationPreview {
  businessId: string;
  businessName: string;
  email: string;
  expiresAt: string;
}

/** Carries the HTTP status so a page can tell "sign in first" (401) from a real refusal. */
export class TeamApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "TeamApiError";
  }
}

async function errorFrom(response: Response, fallback: string): Promise<TeamApiError> {
  try {
    const body = await response.json();
    if (typeof body?.detail === "string" && body.detail.length > 0) {
      return new TeamApiError(body.detail, response.status);
    }
  } catch {
    // Not JSON; use the fallback.
  }
  return new TeamApiError(fallback, response.status);
}

export async function getTeam(businessId: string): Promise<TeamSnapshot> {
  const response = await fetch(`${apiBaseUrl()}/api/v1/businesses/${businessId}/team`, { credentials: "include" });
  if (!response.ok) {
    throw await errorFrom(response, "Failed to load your team.");
  }
  return response.json();
}

export async function inviteMember(businessId: string, email: string, role: BusinessRole = "Restricted"): Promise<PendingInvitation> {
  const response = await fetch(`${apiBaseUrl()}/api/v1/businesses/${businessId}/invitations`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, role }),
  });
  if (!response.ok) {
    throw await errorFrom(response, "Failed to send the invitation.");
  }
  return response.json();
}

export async function changeMemberRole(businessId: string, memberId: string, role: BusinessRole): Promise<void> {
  const response = await fetch(`${apiBaseUrl()}/api/v1/businesses/${businessId}/members/${memberId}/role`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  });
  if (!response.ok) {
    throw await errorFrom(response, "Failed to change this member's role.");
  }
}

export async function cancelInvitation(businessId: string, invitationId: string): Promise<void> {
  const response = await fetch(`${apiBaseUrl()}/api/v1/businesses/${businessId}/invitations/${invitationId}/cancel`, {
    method: "POST",
    credentials: "include",
  });
  if (!response.ok) {
    throw await errorFrom(response, "Failed to cancel the invitation.");
  }
}

export async function removeMember(businessId: string, memberId: string): Promise<void> {
  const response = await fetch(`${apiBaseUrl()}/api/v1/businesses/${businessId}/members/${memberId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!response.ok) {
    throw await errorFrom(response, "Failed to remove this team member.");
  }
}

export async function getInvitation(token: string): Promise<InvitationPreview> {
  const response = await fetch(`${apiBaseUrl()}/api/v1/invitations/${encodeURIComponent(token)}`, { credentials: "include" });
  if (!response.ok) {
    throw await errorFrom(response, "This invitation could not be loaded.");
  }
  return response.json();
}

export async function acceptInvitation(token: string): Promise<InvitationPreview> {
  const response = await fetch(`${apiBaseUrl()}/api/v1/invitations/${encodeURIComponent(token)}/accept`, {
    method: "POST",
    credentials: "include",
  });
  if (!response.ok) {
    throw await errorFrom(response, "This invitation could not be accepted.");
  }
  return response.json();
}
