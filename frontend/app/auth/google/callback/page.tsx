"use client";

import { useEffect } from "react";
import { loadPendingGateAction } from "../../../lib/pendingGateAction";

/**
 * IG-196 / FSD section 8: the backend's Google OAuth callback (AuthEndpoints.GoogleCallbackAsync)
 * has already set the session cookie by the time it redirects here - this page's only job is to
 * land the browser somewhere useful in the app. A server-side redirect can't read the frontend's
 * own localStorage, so the same pending-gate-action check LoginForm's handleSubmit already runs
 * after a normal password sign-in (IG-31/IG-32) runs here instead, client-side.
 */
export default function GoogleAuthCallbackPage() {
  useEffect(() => {
    window.location.href = loadPendingGateAction() ? "/invoice/create" : "/";
  }, []);

  return <p className="mx-auto max-w-md px-6 py-16 text-sm text-slate-600">Signing you in…</p>;
}
