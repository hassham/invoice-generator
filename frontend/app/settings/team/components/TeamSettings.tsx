"use client";

import { useEffect, useState, type FormEvent } from "react";
import { getActiveBusinessId } from "../../../lib/business";
import { cancelInvitation, getTeam, inviteMember, removeMember, type TeamSnapshot } from "../../../lib/teamInvitations";

/**
 * IG-239 / IG-297 / IG-298: the owner invites people by email to the selected business, sees pending
 * invitations and current members, cancels a pending invite, and removes a member's access. A team
 * member who opens this page is told the team is owner-managed rather than shown an empty form.
 */
export function TeamSettings() {
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [team, setTeam] = useState<TeamSnapshot | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = async (id: string) => {
    setTeam(await getTeam(id));
  };

  useEffect(() => {
    let cancelled = false;
    getActiveBusinessId()
      .then(async (id) => {
        if (cancelled) return;
        setBusinessId(id);
        await reload(id);
      })
      .catch((error: unknown) => {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : "Failed to load your team.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleInvite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!businessId) return;
    setSubmitting(true);
    setFormError(null);
    setNotice(null);
    try {
      await inviteMember(businessId, email.trim());
      setNotice(`Invitation sent to ${email.trim()}.`);
      setEmail("");
      await reload(businessId);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Failed to send the invitation.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    if (!businessId) return;
    setBusyId(invitationId);
    setNotice(null);
    try {
      await cancelInvitation(businessId, invitationId);
      await reload(businessId);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Failed to cancel the invitation.");
    } finally {
      setBusyId(null);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!businessId) return;
    setBusyId(memberId);
    setNotice(null);
    try {
      await removeMember(businessId, memberId);
      await reload(businessId);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Failed to remove this team member.");
    } finally {
      setBusyId(null);
    }
  };

  if (loadError) {
    return <p role="alert" className="text-sm text-red-700">{loadError}</p>;
  }

  if (!team) {
    return <p className="text-sm text-slate-600">Loading…</p>;
  }

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-2xl font-bold text-slate-950">Team</h1>
        <p className="mt-2 text-sm text-slate-600">
          Invite someone by email to help manage this business. They can only see the businesses you invite them to.
        </p>
      </header>

      {notice ? <p role="status" className="text-sm text-emerald-700">{notice}</p> : null}
      {formError ? <p role="alert" className="text-sm text-red-700">{formError}</p> : null}

      <form onSubmit={handleInvite} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex-1 text-sm font-medium text-slate-700">
          Email address
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={submitting || email.trim().length === 0}
          className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {submitting ? "Sending…" : "Send invitation"}
        </button>
      </form>

      <section aria-labelledby="pending-invitations">
        <h2 id="pending-invitations" className="text-lg font-semibold text-slate-950">Pending invitations</h2>
        {team.pendingInvitations.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">No pending invitations.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-200">
            {team.pendingInvitations.map((invitation) => (
              <li key={invitation.id} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">{invitation.email}</p>
                  <p className="text-xs text-slate-600">Expires {new Date(invitation.expiresAt).toLocaleDateString()}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleCancelInvitation(invitation.id)}
                  disabled={busyId === invitation.id}
                  className="rounded-full border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel invitation
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="team-members">
        <h2 id="team-members" className="text-lg font-semibold text-slate-950">Team members</h2>
        {team.members.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">No team members yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-200">
            {team.members.map((member) => (
              <li key={member.id} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">{member.email}</p>
                  <p className="text-xs text-slate-600">Joined {new Date(member.joinedAt).toLocaleDateString()}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleRemoveMember(member.id)}
                  disabled={busyId === member.id}
                  className="rounded-full border border-red-200 px-3 py-1 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  Remove access
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
