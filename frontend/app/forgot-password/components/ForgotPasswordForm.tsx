"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { requestPasswordReset } from "../../lib/auth";

/**
 * FSD section 9 (Forgot Password) / IG-195: always shows the same generic confirmation regardless
 * of whether the email matched an account - matches the backend's own anti-enumeration behavior
 * (requestPasswordReset never throws for "email not found", only for a malformed request), so
 * there's nothing here that could leak which emails have accounts.
 */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await requestPasswordReset(email);
      setSubmitted(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to request a password reset.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <h1 className="font-display text-3xl font-bold tracking-tight text-ink">Forgot password</h1>

      {submitted ? (
        <p role="status" className="mt-6 rounded-xl border border-ink bg-mint px-4 py-3 text-sm font-semibold text-[#166534]">
          If an account exists for that email, we&apos;ve sent a link to reset your password.
        </p>
      ) : (
        <>
          <p className="mt-2 text-sm text-muted">Enter your account email and we&apos;ll send you a link to reset your password.</p>

          {error ? (
            <p role="alert" className="mt-4 rounded-xl border border-ink bg-pink px-4 py-3 text-sm font-semibold text-[#991b1b]">
              {error}
            </p>
          ) : null}

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="forgot-password-email" className="text-sm font-semibold text-ink">
                Email
              </label>
              <input
                id="forgot-password-email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="rounded-lg border border-border bg-paper px-3 py-2 font-sans text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="rounded-full border-[1.5px] border-ink bg-accent px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-[#c4ee1a] disabled:opacity-50"
            >
              {submitting ? "Sending…" : "Send reset link"}
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
