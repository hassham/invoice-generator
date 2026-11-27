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
import { SettingsHeading, SettingsNotice, SettingsPanel } from "../../components/SettingsChrome";
import styles from "../../components/SettingsChrome.module.css";

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

  const heading = <SettingsHeading page="team" title={t("team.title")} description={t("team.intro")} />;
  if (loadError) {
    return <>{heading}<SettingsNotice kind="error">{loadError}</SettingsNotice></>;
  }

  if (!team) {
    return <>{heading}<SettingsNotice kind="info">{t("team.loading")}</SettingsNotice></>;
  }

  return (
    <>
      {heading}
      <div className={styles.stack}>
        <SettingsPanel tone="lavender" title={t("team.invite.submit")}>
          {notice ? <SettingsNotice kind="success">{notice}</SettingsNotice> : null}
          {formError ? <SettingsNotice kind="error">{formError}</SettingsNotice> : null}
          <form onSubmit={handleInvite} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="min-w-0 flex-1 text-sm font-medium text-ink">
              {t("team.invite.emailLabel")}
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={`${styles.control} mt-1 block`}
              />
            </label>
            <label className="text-sm font-medium text-ink">
              {t("team.invite.roleLabel")}
              <select
                value={inviteRole}
                onChange={(event) => setInviteRole(event.target.value as BusinessRole)}
                className={`${styles.control} mt-1 block`}
              >
                <option value="Restricted">{BUSINESS_ROLE_LABELS.Restricted}</option>
                <option value="Admin">{BUSINESS_ROLE_LABELS.Admin}</option>
              </select>
            </label>
            <button
              type="submit"
              disabled={submitting || email.trim().length === 0}
              className="workspace-button-primary shrink-0 justify-center disabled:opacity-50"
            >
              {submitting ? t("team.invite.submitting") : t("team.invite.submit")}
            </button>
          </form>
        </SettingsPanel>

        <SettingsPanel tone="yellow" title={t("team.pending.heading")}>
          {team.pendingInvitations.length === 0 ? (
            <p className="mt-2 text-sm text-muted">{t("team.pending.empty")}</p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {team.pendingInvitations.map((invitation) => (
                <li key={invitation.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="break-all text-sm font-medium text-ink">{invitation.email}</p>
                    <p className="text-xs text-muted">
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
                    className="workspace-button-secondary disabled:opacity-50"
                  >
                    {t("team.pending.cancel")}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </SettingsPanel>

        <SettingsPanel tone="mint" title={t("team.members.heading")}>
          {team.members.length === 0 ? (
            <p className="mt-2 text-sm text-muted">{t("team.members.empty")}</p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {team.members.map((member) => (
                <li key={member.id} className="flex flex-wrap items-center justify-between gap-4 py-3">
                  <div>
                    <p className="break-all text-sm font-medium text-ink">{member.email}</p>
                    <p className="text-xs text-muted">{t("team.members.joined", { date: new Date(member.joinedAt).toLocaleDateString() })}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="text-sm text-ink">
                      <span className="sr-only">{t("team.members.roleFor", { email: member.email })}</span>
                      <select
                        value={member.role}
                        disabled={busyId === member.id}
                        onChange={(event) => void handleRoleChange(member.id, event.target.value as BusinessRole)}
                        className={styles.control}
                      >
                        <option value="Restricted">{BUSINESS_ROLE_LABELS.Restricted}</option>
                        <option value="Admin">{BUSINESS_ROLE_LABELS.Admin}</option>
                      </select>
                    </label>
                    <button
                      type="button"
                      onClick={() => void handleRemoveMember(member.id)}
                      disabled={busyId === member.id}
                      className="rounded-full border border-status-overdue-fg/25 px-3 py-1 text-sm font-semibold text-status-overdue-fg hover:bg-status-overdue-bg/55 disabled:opacity-50"
                    >
                      {t("team.members.remove")}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SettingsPanel>
      </div>
    </>
  );
}
