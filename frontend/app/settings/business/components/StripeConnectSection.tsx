"use client";

import { useState } from "react";
import { disconnectStripe, stripeConnectUrl, type BusinessProfile } from "../../../lib/business";

interface StripeConnectSectionProps {
  stripeAccountId: string | null;
  onChange: (profile: BusinessProfile) => void;
}

/**
 * IG-219 / docs/PRD.md section 21 (Payment Settings): "connect my own Stripe account so that
 * payments I receive go to my own bank account, not a shared one." Null stripeAccountId is what
 * IG-216's hosted-invoice Pay Now button will key off of to decide whether to render at all.
 */
export function StripeConnectSection({ stripeAccountId, onChange }: StripeConnectSectionProps) {
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDisconnect = async () => {
    setDisconnecting(true);
    setError(null);
    try {
      const updated = await disconnectStripe();
      onChange(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disconnect Stripe.");
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <fieldset className="rounded-lg border border-slate-200 p-6">
      <legend className="px-1 text-base font-semibold text-slate-950">Payments</legend>
      <p className="mt-1 text-sm text-slate-600">
        Connect your own Stripe account so customers can pay a hosted invoice online, straight into your own bank
        account - this app never handles or stores card details directly.
      </p>

      {error ? (
        <p role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="mt-4">
        {stripeAccountId ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">Connected</span>
            <span className="text-sm text-slate-600">{stripeAccountId}</span>
            <button
              type="button"
              onClick={() => void handleDisconnect()}
              disabled={disconnecting}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {disconnecting ? "Disconnecting…" : "Disconnect"}
            </button>
          </div>
        ) : (
          <a
            href={stripeConnectUrl()}
            className="inline-block rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
          >
            Connect with Stripe
          </a>
        )}
      </div>
    </fieldset>
  );
}
