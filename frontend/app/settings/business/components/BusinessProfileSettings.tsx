"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { BusinessLogoUpload } from "../../../components/business/BusinessLogoUpload";
import { getBusinessProfile, updateBusinessProfile, type BusinessProfile, type BusinessProfileRequest } from "../../../lib/business";
import { BusinessProfileForm, type BusinessProfileFormValues } from "./BusinessProfileForm";
import { StripeConnectSection } from "./StripeConnectSection";

type LoadState = "loading" | "loaded" | "error";

function toFormValues(profile: BusinessProfile): BusinessProfileFormValues {
  const orEmpty = (value: string | null) => value ?? "";

  return {
    businessName: profile.businessName,
    legalName: orEmpty(profile.legalName),
    email: orEmpty(profile.email),
    phone: orEmpty(profile.phone),
    website: orEmpty(profile.website),
    addressLine1: orEmpty(profile.addressLine1),
    addressLine2: orEmpty(profile.addressLine2),
    city: orEmpty(profile.city),
    state: orEmpty(profile.state),
    postalCode: orEmpty(profile.postalCode),
    country: profile.country,
    registrationNumber: orEmpty(profile.registrationNumber),
    taxNumber: orEmpty(profile.taxNumber),
    defaultCurrency: profile.defaultCurrency,
    defaultTaxRate: String(profile.defaultTaxRate),
    taxCalculationMethod: profile.taxCalculationMethod,
    defaultPaymentTerms: profile.defaultPaymentTerms,
    defaultPaymentTermsDays: profile.defaultPaymentTermsDays !== null ? String(profile.defaultPaymentTermsDays) : "",
    defaultInvoiceNotes: orEmpty(profile.defaultInvoiceNotes),
    defaultTermsAndConditions: orEmpty(profile.defaultTermsAndConditions),
    defaultTemplateId: profile.defaultTemplateId ?? "",
    invoicePrefix: profile.invoicePrefix,
    nextInvoiceNumber: String(profile.nextInvoiceNumber),
    invoiceNumberPadding: String(profile.invoiceNumberPadding),
  };
}

/**
 * FSD sections 62/63 (`/settings/business`). IG-51's registration-time default profile is what
 * this page reads/edits - there's exactly one per account, so unlike /customers this needs no id
 * in the route and no create flow.
 */
export function BusinessProfileSettings() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<LoadState>("loading");
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // IG-219: the Stripe Connect round trip ends with a plain server redirect back to this exact
  // page (BusinessEndpoints.StripeCallbackAsync - a full-page navigation, so there's no other way
  // for the backend to hand back a success/failure result than a query param). Captured once, via
  // a lazy initializer, from the URL this component actually mounted with - not read live from
  // searchParams on every render, since the effect below immediately strips the query param (so a
  // refresh doesn't keep re-showing the banner), which would otherwise make the banner vanish the
  // instant it appeared.
  const [stripeConnectResult] = useState<"connected" | "error" | null>(() => {
    if (searchParams.get("stripeConnected")) {
      return "connected";
    }
    if (searchParams.get("stripeConnectError")) {
      return "error";
    }
    return null;
  });
  useEffect(() => {
    if (stripeConnectResult) {
      router.replace("/settings/business");
    }
    // Deliberately mount-only - stripeConnectResult never changes after its lazy init, and
    // re-running this on every router/searchParams identity change would fight the replace().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    getBusinessProfile()
      .then((loaded) => {
        if (!cancelled) {
          setProfile(loaded);
          setState("loaded");
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Failed to load your business profile.");
          setState("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (request: BusinessProfileRequest) => {
    setSubmitting(true);
    setSubmitError(null);
    setSavedAt(null);

    try {
      const updated = await updateBusinessProfile(request);
      setProfile(updated);
      setSavedAt(Date.now());
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to save your business profile.");
    } finally {
      setSubmitting(false);
    }
  };

  if (state === "loading") {
    return <p className="text-sm text-slate-600">Loading your business profile…</p>;
  }

  if (state === "error" || !profile) {
    return (
      <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {loadError}
      </p>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-950">Business Profile</h1>
      <p className="mt-1 text-sm text-slate-600">Configure once and reuse on all your invoices.</p>

      {stripeConnectResult === "connected" ? (
        <p role="status" className="mt-6 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          Stripe account connected.
        </p>
      ) : null}
      {stripeConnectResult === "error" ? (
        <p role="alert" className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Failed to connect your Stripe account. Please try again.
        </p>
      ) : null}

      {savedAt ? (
        <p role="status" className="mt-6 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          Changes saved.
        </p>
      ) : null}

      <div className="mt-6">
        <BusinessLogoUpload logoUrl={profile.logoUrl} onChange={setProfile} />
      </div>

      <div className="mt-6">
        <BusinessProfileForm initialValues={toFormValues(profile)} submitting={submitting} error={submitError} onSubmit={handleSubmit} />
      </div>

      <div className="mt-6">
        <StripeConnectSection stripeAccountId={profile.stripeAccountId} onChange={setProfile} />
      </div>
    </div>
  );
}
