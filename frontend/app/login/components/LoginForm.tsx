"use client";

import Link from "next/link";
import { useState, useSyncExternalStore, type FormEvent } from "react";
import { login } from "../../lib/auth";
import { loadPendingGateAction } from "../../lib/pendingGateAction";

function subscribeNever() {
  return () => {};
}

function getSessionExpiredSnapshot(): boolean {
  return new URLSearchParams(window.location.search).get("sessionExpired") === "1";
}

function getSessionExpiredServerSnapshot(): boolean {
  return false;
}

/**
 * FSD section 8 (Login). "Login with Google" and "Forgot Password" are FSD-listed actions this
 * page doesn't wire up yet: Google's backend callback (AuthEndpoints.GoogleCallbackAsync) has no
 * frontend route to redirect back to and currently just returns raw JSON, and no
 * /forgot-password page exists - both documented gaps, not oversights, left for a follow-up
 * once those destinations exist rather than linking to a dead end.
 */
export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Reads the URL's query string outside of an effect - the server has no window to read from
  // (getServerSnapshot always answers false) so the first client render matches the server's
  // HTML exactly, then this re-reads once hydration attaches real event listeners.
  const sessionExpired = useSyncExternalStore(
    subscribeNever,
    getSessionExpiredSnapshot,
    getSessionExpiredServerSnapshot,
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await login({ email, password, rememberMe });
      // IG-31 / FSD section 37: a pending Download PDF/Print request (IG-30's account gate) means
      // this login was triggered from the invoice editor - return there instead of the homepage so
      // the preserved invoice is what the visitor actually sees next.
      window.location.href = loadPendingGateAction() ? "/invoice/create" : "/";
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to sign in.");
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-bold text-slate-950">Log in</h1>

      {sessionExpired ? (
        <p
          role="alert"
          className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
        >
          Your session has expired. Please sign in again.
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="login-email" className="text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="login-password" className="text-sm font-medium text-slate-700">
            Password
          </label>
          <input
            id="login-password"
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(event) => setRememberMe(event.target.checked)}
          />
          Remember me
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
        >
          {submitting ? "Logging in…" : "Log in"}
        </button>
      </form>

      <p className="mt-6 text-sm text-slate-600">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium text-slate-950 hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
