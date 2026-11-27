"use client";

import { useState } from "react";
import { disconnectStripe, stripeConnectUrl, type BusinessProfile } from "../../../lib/business";

import { SettingsNotice, SettingsPanel } from "../../components/SettingsChrome";

interface StripeConnectSectionProps {
  businessId: string;
  stripeAccountId: string | null;
  onChange: (profile: BusinessProfile) => void;
}

/**
 * IG-219 / docs/PRD.md section 21 (Payment Settings): "connect my own Stripe account so that
 * payments I receive go to my own bank account, not a shared one." Null stripeAccountId is what
 * IG-216's hosted-invoice Pay Now button will key off of to decide whether to render at all.
 */
export function StripeConnectSection({ businessId, stripeAccountId, onChange }: StripeConnectSectionProps) {
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDisconnect = async () => {
    setDisconnecting(true);
    setError(null);
    try {
      const updated = await disconnectStripe(businessId);
      onChange(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disconnect Stripe.");
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <SettingsPanel id="business-payments" title="Payments" tone="mint">
      <p className="mt-1 text-sm text-muted">
        Connect your own Stripe account so customers can pay a hosted invoice online, straight into your own bank
        account - this app never handles or stores card details directly.
      </p>

      {error ? <SettingsNotice kind="error">{error}</SettingsNotice> : null}

      <div className="mt-4">
        {stripeAccountId ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-status-paid-bg px-3 py-1 text-xs font-semibold text-status-paid-fg">Connected</span>
            <span className="break-all font-mono text-sm text-muted">{stripeAccountId}</span>
            <button
              type="button"
              onClick={() => void handleDisconnect()}
              disabled={disconnecting}
              className="workspace-button-secondary disabled:opacity-50"
            >
              {disconnecting ? "Disconnecting…" : "Disconnect"}
            </button>
          </div>
        ) : (
          <a
            href={stripeConnectUrl(businessId)}
            className="workspace-button-secondary"
          >
            Connect with Stripe
          </a>
        )}
      </div>
    </SettingsPanel>
  );
}
