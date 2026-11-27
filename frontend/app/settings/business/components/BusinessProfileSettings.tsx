"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BusinessLogoUpload } from "../../../components/business/BusinessLogoUpload";
import {
  getBusinessProfile,
  getBusinessProfileById,
  updateBusinessProfile,
  updateBusinessProfileById,
  type BusinessProfile,
  type BusinessProfileRequest,
} from "../../../lib/business";
import { useSelectedBusiness } from "../../../lib/BusinessContext";
import { BusinessProfileForm, type BusinessProfileFormValues } from "./BusinessProfileForm";
import { StripeConnectSection } from "./StripeConnectSection";

import { SettingsHeading, SettingsNotice, SettingsPanel } from "../../components/SettingsChrome";
import styles from "../../components/SettingsChrome.module.css";

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
    bankName: orEmpty(profile.bankName ?? null),
    bankAccountName: orEmpty(profile.bankAccountName ?? null),
    bankAccountNumber: orEmpty(profile.bankAccountNumber ?? null),
    bankRoutingCode: orEmpty(profile.bankRoutingCode ?? null),
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
    openTrackingEnabled: profile.openTrackingEnabled ?? true,
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
  const { selectedBusinessId } = useSelectedBusiness();
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
    const load = selectedBusinessId ? getBusinessProfileById(selectedBusinessId) : getBusinessProfile();
    load
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
  }, [selectedBusinessId]);

  const handleSubmit = async (request: BusinessProfileRequest) => {
    setSubmitting(true);
    setSubmitError(null);
    setSavedAt(null);

    try {
      const updated = selectedBusinessId
        ? await updateBusinessProfileById(selectedBusinessId, request)
        : await updateBusinessProfile(request);
      setProfile(updated);
      setSavedAt(Date.now());
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to save your business profile.");
    } finally {
      setSubmitting(false);
    }
  };

  const initialValues = useMemo(() => profile ? toFormValues(profile) : null, [profile]);
  const heading = (
    <SettingsHeading page="business" title="Business Profile" description="Manage your business details and the defaults used on your invoices." />
  );
  if (state === "loading") {
    return <>{heading}<SettingsNotice kind="info">Loading your business profile…</SettingsNotice></>;
  }
  if (state === "error" || !profile || !initialValues) {
    return <>{heading}<SettingsNotice kind="error">{loadError}</SettingsNotice></>;
  }

  const sections = [
    { id: "business-identity", text: "Identity" },
    { id: "business-address", text: "Address" },
    { id: "invoice-defaults", text: "Invoice defaults" },
    { id: "invoice-numbering", text: "Numbering" },
    { id: "bank-details", text: "Bank details" },
    { id: "business-logo", text: "Logo" },
    { id: "business-payments", text: "Payments" },
  ];
  return (
    <>
      {heading}
      <div className={styles.stack}>
        <nav className={styles.shortcuts} aria-label="Business Profile sections">
          {sections.map(({ id, text }) => <a key={id} href={"#" + id}>{text}</a>)}
        </nav>
        {stripeConnectResult === "connected" ? (
          <SettingsNotice kind="success">Stripe account connected.</SettingsNotice>
        ) : stripeConnectResult === "error" ? (
          <SettingsNotice kind="error">Failed to connect your Stripe account. Please try again.</SettingsNotice>
        ) : null}
        <BusinessProfileForm initialValues={initialValues} submitting={submitting} saved={savedAt !== null} error={submitError} onSubmit={handleSubmit} />
        <SettingsPanel id="business-logo" title="Business logo" tone="lavender" description="Add your logo to the invoices you create.">
          <div className={styles.logoUpload}>
            <BusinessLogoUpload businessId={profile.id} logoUrl={profile.logoUrl} onChange={setProfile} />
          </div>
        </SettingsPanel>
        <StripeConnectSection businessId={profile.id} stripeAccountId={profile.stripeAccountId} onChange={setProfile} />
      </div>
    </>
  );
}
