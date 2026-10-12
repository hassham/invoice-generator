"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { setSelectedBusinessId } from "../../../lib/business";
import { acceptInvitation, getInvitation, TeamApiError, type InvitationPreview } from "../../../lib/teamInvitations";

interface InvitationAcceptProps {
  token: string;
}

/**
 * IG-297 / IG-298: the invitee opens the emailed link. They must be signed in with the invited email:
 * a signed-out visitor is asked to sign in or create an account, and someone signed in with a
 * different address is told the invitation was sent elsewhere.
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
          setError(err instanceof Error ? err.message : "This invitation could not be loaded.");
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
      setError(err instanceof Error ? err.message : "This invitation could not be accepted.");
    } finally {
      setAccepting(false);
    }
  };

  if (needsSignIn) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-950">Sign in to accept this invitation</h1>
        <p className="text-sm text-slate-700">
          Sign in or create an account with the email address this invitation was sent to, then open this link again.
        </p>
        <div className="flex gap-3">
          <Link href="/login" className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
            Sign in
          </Link>
          <Link href="/signup" className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
            Create an account
          </Link>
        </div>
      </section>
    );
  }

  if (joined && preview) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-950">You&apos;ve joined {preview.businessName}</h1>
        <p className="text-sm text-slate-700">{preview.businessName} is now selected. You can switch businesses from the header.</p>
        <Link href="/dashboard" className="inline-block rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
          Go to dashboard
        </Link>
      </section>
    );
  }

  if (error && !preview) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-950">Invitation unavailable</h1>
        <p role="alert" className="text-sm text-red-700">{error}</p>
      </section>
    );
  }

  if (!preview) {
    return <p className="text-sm text-slate-600">Loading invitation…</p>;
  }

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-950">Join {preview.businessName}</h1>
      <p className="text-sm text-slate-700">
        You&apos;ve been invited to help manage {preview.businessName}. You will only see this business, not the owner&apos;s others.
      </p>
      {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
      <button
        type="button"
        onClick={() => void handleAccept()}
        disabled={accepting}
        className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {accepting ? "Accepting…" : "Accept invitation"}
      </button>
    </section>
  );
}
