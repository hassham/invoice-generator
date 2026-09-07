"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BusinessLogoUpload } from "../../components/business/BusinessLogoUpload";
import { CURRENCY_OPTIONS } from "../../invoice/create/lib/fields";
import { getBusinessProfile, updateBusinessProfile, type BusinessProfile } from "../../lib/business";
import { ONBOARDING_STEPS, profileToOnboardingValues, toBusinessProfileRequest, type OnboardingStepId, type OnboardingValues } from "../lib/onboarding";

type LoadState = "loading" | "loaded" | "error";

const STEP_LABELS: Record<OnboardingStepId, string> = {
  "business-name": "Business Name",
  country: "Country",
  currency: "Currency",
  tax: "Tax Registration",
  logo: "Logo",
};

/** Which OnboardingValues fields each step governs - used so "Skip this step" reverts only this
 * step's own field(s) back to their last-saved value, rather than silently saving whatever the
 * user had typed (which would make the "Skip" label a lie). */
const STEP_FIELDS: Record<OnboardingStepId, (keyof OnboardingValues)[]> = {
  "business-name": ["businessName"],
  country: ["country"],
  currency: ["defaultCurrency"],
  tax: ["registrationNumber", "taxNumber"],
  logo: [],
};

/**
 * FSD section 116. Every step (including Skip) persists the current values via the same PUT
 * /api/v1/business call the rest of the app already uses (BusinessProfileForm) - "skip" only means
 * this step's own field keeps whatever the loaded profile already had, not that progress on other
 * steps is discarded. That satisfies both AC at once: "users can skip optional steps without being
 * blocked" and "saved steps populate the business profile."
 */
export function OnboardingWizard() {
  const router = useRouter();
  const [state, setState] = useState<LoadState>("loading");
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [values, setValues] = useState<OnboardingValues | null>(null);
  // The last-saved values, distinct from `values` (what's currently typed) - "Skip this step"
  // reverts to this, not to whatever the user happened to type before deciding to skip.
  const [savedValues, setSavedValues] = useState<OnboardingValues | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getBusinessProfile()
      .then((loaded) => {
        if (!cancelled) {
          setProfile(loaded);
          setValues(profileToOnboardingValues(loaded));
          setSavedValues(profileToOnboardingValues(loaded));
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

  const finish = () => {
    router.push("/invoice/create");
  };

  const advance = async (options: { skip?: boolean } = {}) => {
    if (!profile || !values || !savedValues) {
      return;
    }

    // Skip reverts only this step's own field(s) to their last-saved value - other steps' already
    //-entered values (saved on earlier "Save & Continue"/"Skip" actions) are carried forward
    // unchanged, not discarded.
    const step = ONBOARDING_STEPS[stepIndex];
    const effectiveValues = options.skip
      ? { ...values, ...Object.fromEntries(STEP_FIELDS[step].map((field) => [field, savedValues[field]])) }
      : values;

    setSaving(true);
    setSaveError(null);
    try {
      const updated = await updateBusinessProfile(toBusinessProfileRequest(profile, effectiveValues));
      setProfile(updated);
      const updatedValues = profileToOnboardingValues(updated);
      setValues(updatedValues);
      setSavedValues(updatedValues);
      if (stepIndex === ONBOARDING_STEPS.length - 1) {
        finish();
        return;
      }
      setStepIndex((index) => index + 1);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Failed to save this step.");
    } finally {
      setSaving(false);
    }
  };

  if (state === "loading") {
    return <p className="text-sm text-slate-600">Loading…</p>;
  }

  if (state === "error" || !profile || !values) {
    return (
      <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {loadError}
      </p>
    );
  }

  const step = ONBOARDING_STEPS[stepIndex];
  const isLastStep = stepIndex === ONBOARDING_STEPS.length - 1;
  const setField = (field: keyof OnboardingValues) => (value: string) => {
    setValues((current) => (current ? { ...current, [field]: value } : current));
  };

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-950">Set up your business</h1>
        <button type="button" onClick={finish} className="text-sm font-medium text-slate-600 hover:underline">
          Skip onboarding
        </button>
      </div>
      <p className="mt-1 text-sm text-slate-600">
        Step {stepIndex + 1} of {ONBOARDING_STEPS.length}: {STEP_LABELS[step]}
      </p>

      {saveError ? (
        <p role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {saveError}
        </p>
      ) : null}

      <div className="mt-6">
        {step === "business-name" ? (
          <TextField
            id="onboarding-business-name"
            label="Business Name"
            value={values.businessName}
            onChange={setField("businessName")}
          />
        ) : null}

        {step === "country" ? (
          <TextField id="onboarding-country" label="Country" value={values.country} onChange={setField("country")} maxLength={2} />
        ) : null}

        {step === "currency" ? (
          <div className="flex flex-col gap-1">
            <label htmlFor="onboarding-currency" className="text-sm font-medium text-slate-700">
              Currency
            </label>
            <select
              id="onboarding-currency"
              value={values.defaultCurrency}
              onChange={(event) => setField("defaultCurrency")(event.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950"
            >
              {CURRENCY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {step === "tax" ? (
          <div className="flex flex-col gap-4">
            <TextField
              id="onboarding-registration-number"
              label="Registration Number"
              value={values.registrationNumber}
              onChange={setField("registrationNumber")}
            />
            <TextField id="onboarding-tax-number" label="Tax Number" value={values.taxNumber} onChange={setField("taxNumber")} />
          </div>
        ) : null}

        {step === "logo" ? <BusinessLogoUpload logoUrl={profile.logoUrl} onChange={setProfile} /> : null}
      </div>

      <div className="mt-8 flex items-center gap-3">
        <button
          type="button"
          onClick={() => advance()}
          disabled={saving}
          className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
        >
          {saving ? "Saving…" : isLastStep ? "Start Creating Invoices" : "Save & Continue"}
        </button>
        {!isLastStep ? (
          <button
            type="button"
            onClick={() => advance({ skip: true })}
            disabled={saving}
            className="text-sm font-medium text-slate-600 hover:underline disabled:opacity-50"
          >
            Skip this step
          </button>
        ) : null}
      </div>
    </div>
  );
}

interface TextFieldProps {
  id: string;
  label: string;
  value: string;
  maxLength?: number;
  onChange: (value: string) => void;
}

function TextField({ id, label, value, maxLength, onChange }: TextFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950"
      />
    </div>
  );
}
