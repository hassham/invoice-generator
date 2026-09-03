"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { TaxCalculationMethod } from "../../../invoice/create/lib/invoiceTotals";
import { fetchTemplates, type Template } from "../../../invoice/create/lib/templates";
import { TemplateSelector } from "../../../invoice/create/components/TemplateSelector";
import { CURRENCY_OPTIONS } from "../../../invoice/create/lib/fields";
import {
  formatInvoiceNumberPreview,
  PAYMENT_TERMS_LABELS,
  PAYMENT_TERMS_OPTIONS,
  type BusinessProfileRequest,
  type PaymentTermsOption,
} from "../../../lib/business";

export interface BusinessProfileFormValues {
  businessName: string;
  legalName: string;
  email: string;
  phone: string;
  website: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  registrationNumber: string;
  taxNumber: string;
  defaultCurrency: string;
  defaultTaxRate: string;
  taxCalculationMethod: TaxCalculationMethod;
  defaultPaymentTerms: PaymentTermsOption;
  defaultPaymentTermsDays: string;
  defaultInvoiceNotes: string;
  defaultTermsAndConditions: string;
  defaultTemplateId: string;
  invoicePrefix: string;
  nextInvoiceNumber: string;
  invoiceNumberPadding: string;
}

function trimmedOrNull(value: string): string | null {
  return value.trim() === "" ? null : value.trim();
}

function toRequest(values: BusinessProfileFormValues): BusinessProfileRequest {
  const parsedTaxRate = Number.parseFloat(values.defaultTaxRate);
  const parsedTermsDays = Number.parseInt(values.defaultPaymentTermsDays, 10);
  const parsedNextInvoiceNumber = Number.parseInt(values.nextInvoiceNumber, 10);
  const parsedInvoiceNumberPadding = Number.parseInt(values.invoiceNumberPadding, 10);

  return {
    businessName: values.businessName.trim(),
    legalName: trimmedOrNull(values.legalName),
    email: trimmedOrNull(values.email),
    phone: trimmedOrNull(values.phone),
    website: trimmedOrNull(values.website),
    addressLine1: trimmedOrNull(values.addressLine1),
    addressLine2: trimmedOrNull(values.addressLine2),
    city: trimmedOrNull(values.city),
    state: trimmedOrNull(values.state),
    postalCode: trimmedOrNull(values.postalCode),
    country: values.country.trim().toUpperCase(),
    registrationNumber: trimmedOrNull(values.registrationNumber),
    taxNumber: trimmedOrNull(values.taxNumber),
    defaultCurrency: values.defaultCurrency.trim().toUpperCase(),
    defaultTaxRate: Number.isFinite(parsedTaxRate) ? parsedTaxRate : 0,
    taxCalculationMethod: values.taxCalculationMethod,
    defaultPaymentTerms: values.defaultPaymentTerms,
    defaultPaymentTermsDays: values.defaultPaymentTerms === "Custom" && Number.isFinite(parsedTermsDays) ? parsedTermsDays : null,
    defaultInvoiceNotes: trimmedOrNull(values.defaultInvoiceNotes),
    defaultTermsAndConditions: trimmedOrNull(values.defaultTermsAndConditions),
    defaultTemplateId: trimmedOrNull(values.defaultTemplateId),
    invoicePrefix: values.invoicePrefix.trim(),
    nextInvoiceNumber: Number.isFinite(parsedNextInvoiceNumber) ? parsedNextInvoiceNumber : 1,
    invoiceNumberPadding: Number.isFinite(parsedInvoiceNumberPadding) ? parsedInvoiceNumberPadding : 4,
  };
}

interface BusinessProfileFormProps {
  initialValues: BusinessProfileFormValues;
  submitting: boolean;
  error: string | null;
  onSubmit: (request: BusinessProfileRequest) => void;
}

/**
 * FSD sections 62 (identity/contact fields), 63 (invoice defaults) and 64 (invoice numbering).
 * Logo is deliberately not here - see IG-53's Jira comment for why (no server-side file storage
 * exists anywhere in this app).
 */
export function BusinessProfileForm({ initialValues, submitting, error, onSubmit }: BusinessProfileFormProps) {
  const [values, setValues] = useState<BusinessProfileFormValues>(initialValues);
  const [nameError, setNameError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templatesError, setTemplatesError] = useState<string | null>(null);

  useEffect(() => {
    // Only re-syncs when the loaded profile itself changes (a fresh GET) - not on every
    // keystroke, since `initialValues` is a stable reference from the parent until then.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValues(initialValues);
  }, [initialValues]);

  useEffect(() => {
    let cancelled = false;
    fetchTemplates()
      .then((loaded) => {
        if (!cancelled) {
          setTemplates(loaded);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTemplatesError("Failed to load templates.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setTemplatesLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setField = (field: keyof BusinessProfileFormValues) => (event: { target: { value: string } }) => {
    setValues((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (values.businessName.trim() === "") {
      setNameError("Business name is required.");
      return;
    }
    setNameError(null);

    onSubmit(toRequest(values));
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {error ? (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {nameError ? (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {nameError}
        </p>
      ) : null}

      <fieldset>
        <legend className="text-base font-semibold text-slate-950">Business Identity</legend>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <TextField id="business-name" label="Business Name" value={values.businessName} onChange={setField("businessName")} />
          <TextField id="business-legal-name" label="Legal Name" value={values.legalName} onChange={setField("legalName")} />
          <TextField id="business-email" label="Email" type="email" value={values.email} onChange={setField("email")} />
          <TextField id="business-phone" label="Phone" value={values.phone} onChange={setField("phone")} />
          <TextField id="business-website" label="Website" value={values.website} onChange={setField("website")} />
          <TextField id="business-registration-number" label="Registration Number" value={values.registrationNumber} onChange={setField("registrationNumber")} />
          <TextField id="business-tax-number" label="Tax Number" value={values.taxNumber} onChange={setField("taxNumber")} />
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-base font-semibold text-slate-950">Address</legend>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <TextField id="business-address-1" label="Address Line 1" value={values.addressLine1} onChange={setField("addressLine1")} />
          <TextField id="business-address-2" label="Address Line 2" value={values.addressLine2} onChange={setField("addressLine2")} />
          <TextField id="business-city" label="City" value={values.city} onChange={setField("city")} />
          <TextField id="business-state" label="State / Province" value={values.state} onChange={setField("state")} />
          <TextField id="business-postal-code" label="Postal Code" value={values.postalCode} onChange={setField("postalCode")} />
          <TextField id="business-country" label="Country" value={values.country} onChange={setField("country")} maxLength={2} />
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-base font-semibold text-slate-950">Invoice Defaults</legend>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="business-default-currency" className="text-sm font-medium text-slate-700">
              Default Currency
            </label>
            <select
              id="business-default-currency"
              value={values.defaultCurrency}
              onChange={setField("defaultCurrency")}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950"
            >
              {CURRENCY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <TextField id="business-default-tax-rate" label="Default Tax Rate (%)" type="number" value={values.defaultTaxRate} onChange={setField("defaultTaxRate")} />

          <div className="flex flex-col gap-1">
            <label htmlFor="business-tax-calculation-method" className="text-sm font-medium text-slate-700">
              Tax Calculation
            </label>
            <select
              id="business-tax-calculation-method"
              value={values.taxCalculationMethod}
              onChange={setField("taxCalculationMethod")}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950"
            >
              <option value="Exclusive">Tax Exclusive</option>
              <option value="Inclusive">Tax Inclusive</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="business-default-payment-terms" className="text-sm font-medium text-slate-700">
              Default Payment Terms
            </label>
            <select
              id="business-default-payment-terms"
              value={values.defaultPaymentTerms}
              onChange={setField("defaultPaymentTerms")}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950"
            >
              {PAYMENT_TERMS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {PAYMENT_TERMS_LABELS[option]}
                </option>
              ))}
            </select>
          </div>

          {values.defaultPaymentTerms === "Custom" ? (
            <TextField
              id="business-default-payment-terms-days"
              label="Custom Terms (Days)"
              type="number"
              value={values.defaultPaymentTermsDays}
              onChange={setField("defaultPaymentTermsDays")}
            />
          ) : null}
        </div>

        <div className="mt-4 flex flex-col gap-1">
          <label htmlFor="business-default-invoice-notes" className="text-sm font-medium text-slate-700">
            Default Invoice Notes
          </label>
          <textarea
            id="business-default-invoice-notes"
            value={values.defaultInvoiceNotes}
            onChange={setField("defaultInvoiceNotes")}
            rows={3}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950"
          />
        </div>

        <div className="mt-4 flex flex-col gap-1">
          <label htmlFor="business-default-terms" className="text-sm font-medium text-slate-700">
            Default Terms &amp; Conditions
          </label>
          <textarea
            id="business-default-terms"
            value={values.defaultTermsAndConditions}
            onChange={setField("defaultTermsAndConditions")}
            rows={3}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950"
          />
        </div>

        <div className="mt-6">
          <TemplateSelector
            templates={templates}
            selectedTemplateId={values.defaultTemplateId}
            loading={templatesLoading}
            error={templatesError}
            onSelect={(templateId) => setValues((current) => ({ ...current, defaultTemplateId: templateId }))}
          />
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-base font-semibold text-slate-950">Invoice Numbering</legend>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <TextField id="business-invoice-prefix" label="Prefix" value={values.invoicePrefix} onChange={setField("invoicePrefix")} maxLength={20} />
          <TextField id="business-next-invoice-number" label="Next Number" type="number" value={values.nextInvoiceNumber} onChange={setField("nextInvoiceNumber")} />
          <TextField id="business-invoice-number-padding" label="Number Padding" type="number" value={values.invoiceNumberPadding} onChange={setField("invoiceNumberPadding")} />
        </div>
        <p className="mt-2 text-sm text-slate-600">
          Preview:{" "}
          <span className="font-mono font-semibold text-slate-950">
            {formatInvoiceNumberPreview(values.invoicePrefix, Number.parseInt(values.nextInvoiceNumber, 10), Number.parseInt(values.invoiceNumberPadding, 10))}
          </span>
        </p>
      </fieldset>

      <button
        type="submit"
        disabled={submitting}
        className="self-start rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
      >
        {submitting ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}

interface TextFieldProps {
  id: string;
  label: string;
  value: string;
  type?: string;
  maxLength?: number;
  onChange: (event: { target: { value: string } }) => void;
}

function TextField({ id, label, value, type = "text", maxLength, onChange }: TextFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        maxLength={maxLength}
        onChange={onChange}
        className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950"
      />
    </div>
  );
}
