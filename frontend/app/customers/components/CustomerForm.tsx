"use client";

import { useState, type FormEvent } from "react";
import type { CustomerRequest } from "../../lib/customers";

export interface CustomerFormValues {
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  taxNumber: string;
  notes: string;
}

export const emptyCustomerFormValues: CustomerFormValues = {
  businessName: "",
  contactName: "",
  email: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
  taxNumber: "",
  notes: "",
};

function toRequest(values: CustomerFormValues): CustomerRequest {
  const trimmedOrNull = (value: string) => (value.trim() === "" ? null : value.trim());

  return {
    businessName: trimmedOrNull(values.businessName),
    contactName: trimmedOrNull(values.contactName),
    email: trimmedOrNull(values.email),
    phone: trimmedOrNull(values.phone),
    addressLine1: trimmedOrNull(values.addressLine1),
    addressLine2: trimmedOrNull(values.addressLine2),
    city: trimmedOrNull(values.city),
    state: trimmedOrNull(values.state),
    postalCode: trimmedOrNull(values.postalCode),
    country: trimmedOrNull(values.country),
    taxNumber: trimmedOrNull(values.taxNumber),
    notes: trimmedOrNull(values.notes),
  };
}

interface CustomerFormProps {
  initialValues?: CustomerFormValues;
  submitting: boolean;
  submitLabel: string;
  error: string | null;
  onSubmit: (request: CustomerRequest) => void;
}

/**
 * FSD section 56: Business Name, Contact Name, Email, Phone, Address, Tax Number, Notes - only
 * "Customer Name" is required. docs/DATABASE_SCHEMA.md has no single customer-name column (only
 * nullable BusinessName/ContactName), so - matching CustomerRequestValidator's server-side rule -
 * this only enforces that at least one of the two is filled, client-side, before ever calling the
 * backend.
 */
export function CustomerForm({ initialValues = emptyCustomerFormValues, submitting, submitLabel, error, onSubmit }: CustomerFormProps) {
  const [values, setValues] = useState<CustomerFormValues>(initialValues);
  const [nameError, setNameError] = useState<string | null>(null);

  const setField = (field: keyof CustomerFormValues) => (event: { target: { value: string } }) => {
    setValues((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (values.businessName.trim() === "" && values.contactName.trim() === "") {
      setNameError("Enter a business name or a contact name.");
      return;
    }
    setNameError(null);

    onSubmit(toRequest(values));
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField id="customer-business-name" label="Business Name" value={values.businessName} onChange={setField("businessName")} />
        <TextField id="customer-contact-name" label="Contact Name" value={values.contactName} onChange={setField("contactName")} />
        <TextField id="customer-email" label="Email" type="email" value={values.email} onChange={setField("email")} />
        <TextField id="customer-phone" label="Phone" value={values.phone} onChange={setField("phone")} />
        <TextField id="customer-address-1" label="Address Line 1" value={values.addressLine1} onChange={setField("addressLine1")} />
        <TextField id="customer-address-2" label="Address Line 2" value={values.addressLine2} onChange={setField("addressLine2")} />
        <TextField id="customer-city" label="City" value={values.city} onChange={setField("city")} />
        <TextField id="customer-state" label="State / Province" value={values.state} onChange={setField("state")} />
        <TextField id="customer-postal-code" label="Postal Code" value={values.postalCode} onChange={setField("postalCode")} />
        <TextField id="customer-country" label="Country" value={values.country} onChange={setField("country")} maxLength={2} />
        <TextField id="customer-tax-number" label="Tax Number" value={values.taxNumber} onChange={setField("taxNumber")} />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="customer-notes" className="text-sm font-medium text-slate-700">
          Notes
        </label>
        <textarea
          id="customer-notes"
          value={values.notes}
          onChange={setField("notes")}
          rows={4}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="self-start rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
      >
        {submitting ? "Saving…" : submitLabel}
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
