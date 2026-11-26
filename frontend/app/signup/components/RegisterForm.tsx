"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { googleLoginUrl, registerAccount } from "../../lib/auth";
import { loadPendingGateAction } from "../../lib/pendingGateAction";

/**
 * FSD section 7/7.1 (Registration). Password complexity (uppercase/lowercase/digit/8+ chars) is
 * enforced server-side only (backend/src/InvoiceApp.Modules.Identity/Registration/
 * RegistrationRequestValidator.cs deliberately doesn't duplicate Identity's PasswordOptions, so
 * the two rule sets can't drift) - this form mirrors that by showing the rule as a hint rather
 * than a client-side gate, and surfaces the server's own message if it's violated. The one rule
 * checked client-side (passwords matching) mirrors a check the validator already makes too, so
 * it isn't a new rule - just a short-circuit that avoids a round trip for the most common typo.
 */
export function RegisterForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Password and confirm password must match.");
      return;
    }

    setSubmitting(true);
    try {
      await registerAccount({
        email,
        password,
        confirmPassword,
        name: name.trim().length > 0 ? name : null,
      });
      // IG-31 / FSD section 37: a pending Download PDF/Print request (IG-30's account gate) means
      // this registration was triggered from the invoice editor - return there instead of the
      // homepage so the preserved invoice is what the visitor actually sees next. Otherwise,
      // FSD section 116: send a fresh registration into the guided (skippable) onboarding wizard.
      window.location.href = loadPendingGateAction() ? "/invoice/create" : "/onboarding";
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to create your account.");
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <h1 className="font-display text-3xl font-bold tracking-tight text-ink">Sign up</h1>

      {error ? (
        <p role="alert" className="mt-4 rounded-xl border border-ink bg-pink px-4 py-3 text-sm font-semibold text-[#991b1b]">
          {error}
        </p>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="signup-email" className="text-sm font-semibold text-ink">
            Email
          </label>
          <input
            id="signup-email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded-lg border border-border bg-paper px-3 py-2 font-sans text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="signup-name" className="text-sm font-semibold text-ink">
            Name <span className="font-normal text-muted">(optional)</span>
          </label>
          <input
            id="signup-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="rounded-lg border border-border bg-paper px-3 py-2 font-sans text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="signup-password" className="text-sm font-semibold text-ink">
            Password
          </label>
          <input
            id="signup-password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="rounded-lg border border-border bg-paper px-3 py-2 font-sans text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
          />
          <p className="text-xs text-muted">
            At least 8 characters, with an uppercase letter, a lowercase letter and a number.
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="signup-confirm-password" className="text-sm font-semibold text-ink">
            Confirm password
          </label>
          <input
            id="signup-confirm-password"
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
          {submitting ? "Creating account…" : "Sign up"}
        </button>
      </form>

      <div className="mt-4 flex items-center gap-3 text-xs text-muted">
        <div className="h-px flex-1 bg-border" />
        or
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* IG-196: a plain <a href>, not a click handler - GET /api/v1/auth/google/login must be a
          genuine full-page navigation to trigger its 302 challenge redirect to Google. */}
      <a
        href={googleLoginUrl()}
        className="mt-4 flex items-center justify-center rounded-full border-[1.5px] border-ink bg-paper px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-canvas"
      >
        Continue with Google
      </a>

      <p className="mt-6 text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-ink underline-offset-4 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
