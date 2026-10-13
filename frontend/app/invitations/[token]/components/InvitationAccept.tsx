"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { setSelectedBusinessId } from "../../../lib/business";
import { t } from "../../../lib/messages";
import { acceptInvitation, getInvitation, TeamApiError, type InvitationPreview } from "../../../lib/teamInvitations";

interface InvitationAcceptProps {
  token: string;
}

/**
 * IG-297 / IG-298: the invitee opens the emailed link. They must be signed in with the invited email:
 * a signed-out visitor is asked to sign in or create an account, and someone signed in with a
 * different address is told the invitation was sent elsewhere. All visible text comes from the message
 * catalogue (IG-241).
 */
export function InvitationAccept({ token }: InvitationAcceptProps) {
  const [preview, setPreview] = useState<InvitationPreview | null>(null);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getInvitation(token)
      .then((loaded) => {
        if (!cancelled) setPreview(loaded);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof TeamApiError && err.status === 401) {
          setNeedsSignIn(true);
        } else {
          setError(err instanceof Error ? err.message : t("invitation.error.load"));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleAccept = async () => {
    setAccepting(true);
    setError(null);
    try {
      const accepted = await acceptInvitation(token);
      setSelectedBusinessId(accepted.businessId);
      setJoined(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("invitation.error.accept"));
    } finally {
      setAccepting(false);
    }
  };

  if (needsSignIn) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-950">{t("invitation.signIn.title")}</h1>
        <p className="text-sm text-slate-700">{t("invitation.signIn.body")}</p>
        <div className="flex gap-3">
          <Link href="/login" className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
            {t("invitation.signIn.button")}
          </Link>
          <Link href="/signup" className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
            {t("invitation.signIn.createAccount")}
          </Link>
        </div>
      </section>
    );
  }

  if (joined && preview) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-950">{t("invitation.joined.title", { businessName: preview.businessName })}</h1>
        <p className="text-sm text-slate-700">{t("invitation.joined.body", { businessName: preview.businessName })}</p>
        <Link href="/dashboard" className="inline-block rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
          {t("invitation.joined.dashboard")}
        </Link>
      </section>
    );
  }

  if (error && !preview) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-950">{t("invitation.unavailable.title")}</h1>
        <p role="alert" className="text-sm text-red-700">{error}</p>
      </section>
    );
  }

  if (!preview) {
    return <p className="text-sm text-slate-600">{t("invitation.loading")}</p>;
  }

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-950">{t("invitation.join.title", { businessName: preview.businessName })}</h1>
      <p className="text-sm text-slate-700">{t("invitation.join.body", { businessName: preview.businessName })}</p>
      {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
      <button
        type="button"
        onClick={() => void handleAccept()}
        disabled={accepting}
        className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {accepting ? t("invitation.join.accepting") : t("invitation.join.accept")}
      </button>
    </section>
  );
}
