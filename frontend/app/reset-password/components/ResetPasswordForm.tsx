"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { resetPassword } from "../../lib/auth";

/**
 * FSD section 9 (Reset Password) / IG-195. A real emailed link would carry both `email` and
 * `token` in its query string (the dev-only log stub - IPasswordResetEmailSender - only ever
 * prints the raw token, not a full link, so email is also collected as an editable field rather
 * than assumed to always arrive pre-filled).
 */
export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [token, setToken] = useState(searchParams.get("token") ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("New password and confirm password must match.");
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword({ email, token, newPassword, confirmPassword });
      setSubmitted(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to reset your password.");
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <h1 className="font-display text-3xl font-bold tracking-tight text-ink">Reset password</h1>

      {submitted ? (
        <>
          <p role="status" className="mt-6 rounded-xl border border-ink bg-mint px-4 py-3 text-sm font-semibold text-[#166534]">
            Your password has been reset.
          </p>
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="mt-6 rounded-full border-[1.5px] border-ink bg-accent px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-[#c4ee1a]"
          >
            Log in
          </button>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm text-muted">Enter the reset link details along with your new password.</p>

          {error ? (
            <p role="alert" className="mt-4 rounded-xl border border-ink bg-pink px-4 py-3 text-sm font-semibold text-[#991b1b]">
              {error}
            </p>
          ) : null}

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="reset-password-email" className="text-sm font-semibold text-ink">
                Email
              </label>
              <input
                id="reset-password-email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="rounded-lg border border-border bg-paper px-3 py-2 font-sans text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="reset-password-token" className="text-sm font-semibold text-ink">
                Reset token
              </label>
              <input
                id="reset-password-token"
                type="text"
                required
                value={token}
                onChange={(event) => setToken(event.target.value)}
                className="rounded-lg border border-border bg-paper px-3 py-2 font-sans text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="reset-password-new" className="text-sm font-semibold text-ink">
                New password
              </label>
              <input
                id="reset-password-new"
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="rounded-lg border border-border bg-paper px-3 py-2 font-sans text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
              />
              <p className="text-xs text-muted">At least 8 characters, with an uppercase letter, a lowercase letter and a number.</p>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="reset-password-confirm" className="text-sm font-semibold text-ink">
                Confirm new password
              </label>
              <input
                id="reset-password-confirm"
                type="password"
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="rounded-lg border border-border bg-paper px-3 py-2 font-sans text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="rounded-full border-[1.5px] border-ink bg-accent px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-[#c4ee1a] disabled:opacity-50"
            >
              {submitting ? "Resetting…" : "Reset password"}
            </button>
          </form>
        </>
      )}

      <p className="mt-6 text-sm text-muted">
        <Link href="/login" className="font-semibold text-ink underline-offset-4 hover:underline">
          Back to log in
        </Link>
      </p>
    </div>
  );
}
