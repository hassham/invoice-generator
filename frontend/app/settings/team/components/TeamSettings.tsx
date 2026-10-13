"use client";

import { useEffect, useState, type FormEvent } from "react";
import { getActiveBusinessId } from "../../../lib/business";
import {
  BUSINESS_ROLE_LABELS,
  cancelInvitation,
  changeMemberRole,
  getTeam,
  inviteMember,
  removeMember,
  type BusinessRole,
  type TeamSnapshot,
} from "../../../lib/teamInvitations";
import { t } from "../../../lib/messages";

/**
 * IG-239 / IG-297 / IG-298 / IG-240: the owner invites people by email to the selected business, picks
 * their role (Restricted by default), changes a member's role, cancels a pending invite, and removes a
 * member's access. A team member who opens this page is told the team is owner-managed.
 * All visible text comes from the message catalogue (IG-241).
 */
export function TeamSettings() {
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [team, setTeam] = useState<TeamSnapshot | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<BusinessRole>("Restricted");
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
        if (!cancelled) setLoadError(error instanceof Error ? error.message : t("team.error.load"));
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
      await inviteMember(businessId, email.trim(), inviteRole);
      setNotice(t("team.invite.sent", { email: email.trim(), role: inviteRole }));
      setEmail("");
      await reload(businessId);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : t("team.error.invite"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRoleChange = async (memberId: string, role: BusinessRole) => {
    if (!businessId) return;
    setBusyId(memberId);
    setNotice(null);
    setFormError(null);
    try {
      await changeMemberRole(businessId, memberId, role);
      await reload(businessId);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : t("team.error.roleChange"));
    } finally {
      setBusyId(null);
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
      setFormError(error instanceof Error ? error.message : t("team.error.cancel"));
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
      setFormError(error instanceof Error ? error.message : t("team.error.remove"));
    } finally {
      setBusyId(null);
    }
  };

  if (loadError) {
    return <p role="alert" className="text-sm text-red-700">{loadError}</p>;
  }

  if (!team) {
    return <p className="text-sm text-slate-600">{t("team.loading")}</p>;
  }

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-2xl font-bold text-slate-950">{t("team.title")}</h1>
        <p className="mt-2 text-sm text-slate-600">{t("team.intro")}</p>
      </header>

      {notice ? <p role="status" className="text-sm text-emerald-700">{notice}</p> : null}
      {formError ? <p role="alert" className="text-sm text-red-700">{formError}</p> : null}

      <form onSubmit={handleInvite} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex-1 text-sm font-medium text-slate-700">
          {t("team.invite.emailLabel")}
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          {t("team.invite.roleLabel")}
          <select
            value={inviteRole}
            onChange={(event) => setInviteRole(event.target.value as BusinessRole)}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="Restricted">{BUSINESS_ROLE_LABELS.Restricted}</option>
            <option value="Admin">{BUSINESS_ROLE_LABELS.Admin}</option>
          </select>
        </label>
        <button
          type="submit"
          disabled={submitting || email.trim().length === 0}
          className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {submitting ? t("team.invite.submitting") : t("team.invite.submit")}
        </button>
      </form>

      <section aria-labelledby="pending-invitations">
        <h2 id="pending-invitations" className="text-lg font-semibold text-slate-950">{t("team.pending.heading")}</h2>
        {team.pendingInvitations.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">{t("team.pending.empty")}</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-200">
            {team.pendingInvitations.map((invitation) => (
              <li key={invitation.id} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">{invitation.email}</p>
                  <p className="text-xs text-slate-600">
                    {t("team.pending.detail", {
                      role: BUSINESS_ROLE_LABELS[invitation.role],
                      date: new Date(invitation.expiresAt).toLocaleDateString(),
                    })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleCancelInvitation(invitation.id)}
                  disabled={busyId === invitation.id}
                  className="rounded-full border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {t("team.pending.cancel")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="team-members">
        <h2 id="team-members" className="text-lg font-semibold text-slate-950">{t("team.members.heading")}</h2>
        {team.members.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">{t("team.members.empty")}</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-200">
            {team.members.map((member) => (
              <li key={member.id} className="flex flex-wrap items-center justify-between gap-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">{member.email}</p>
                  <p className="text-xs text-slate-600">{t("team.members.joined", { date: new Date(member.joinedAt).toLocaleDateString() })}</p>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-sm text-slate-700">
                    <span className="sr-only">{t("team.members.roleFor", { email: member.email })}</span>
                    <select
                      value={member.role}
                      disabled={busyId === member.id}
                      onChange={(event) => void handleRoleChange(member.id, event.target.value as BusinessRole)}
                      className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
                    >
                      <option value="Restricted">{BUSINESS_ROLE_LABELS.Restricted}</option>
                      <option value="Admin">{BUSINESS_ROLE_LABELS.Admin}</option>
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={() => void handleRemoveMember(member.id)}
                    disabled={busyId === member.id}
                    className="rounded-full border border-red-200 px-3 py-1 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    {t("team.members.remove")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
