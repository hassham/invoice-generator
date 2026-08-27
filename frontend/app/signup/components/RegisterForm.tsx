"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { registerAccount } from "../../lib/auth";

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
      window.location.href = "/";
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to create your account.");
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-bold text-slate-950">Sign up</h1>

      {error ? (
        <p role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="signup-email" className="text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            id="signup-email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="signup-name" className="text-sm font-medium text-slate-700">
            Name <span className="font-normal text-slate-500">(optional)</span>
          </label>
          <input
            id="signup-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="signup-password" className="text-sm font-medium text-slate-700">
            Password
          </label>
          <input
            id="signup-password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950"
          />
          <p className="text-xs text-slate-500">
            At least 8 characters, with an uppercase letter, a lowercase letter and a number.
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="signup-confirm-password" className="text-sm font-medium text-slate-700">
            Confirm password
          </label>
          <input
            id="signup-confirm-password"
            type="password"
            required
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
        >
          {submitting ? "Creating account…" : "Sign up"}
        </button>
      </form>

      <p className="mt-6 text-sm text-slate-600">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-slate-950 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
