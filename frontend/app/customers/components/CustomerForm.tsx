"use client";

import { useState, type FormEvent } from "react";
import { RecordFormActions, RecordFormLayout, RecordFormPreview, RecordFormSection } from "../../components/ui/WorkspaceRecordForm";
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
  isNew?: boolean;
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
export function CustomerForm({ initialValues = emptyCustomerFormValues, isNew = false, submitting, submitLabel, error, onSubmit }: CustomerFormProps) {
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
    <RecordFormLayout kind="customer" preview={isNew ? (
      <RecordFormPreview kind="customer" title={values.businessName.trim() || values.contactName.trim() || "Your customer name"}>
        {values.contactName.trim() && values.businessName.trim() ? <p>{values.contactName.trim()}</p> : null}
        <p>{values.email.trim() || "The billing email will appear here."}</p>
        {values.phone.trim() ? <p>{values.phone.trim()}</p> : null}
      </RecordFormPreview>
    ) : undefined}>
      <form onSubmit={handleSubmit}>
        {error || nameError ? <p role="alert" className="record-form-error">{nameError ?? error}</p> : null}
        <RecordFormSection number="01" title="Contact details" description="Enter a business name or a contact name. Email and phone are optional.">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField id="customer-business-name" label="Business Name" value={values.businessName} onChange={setField("businessName")} />
            <TextField id="customer-contact-name" label="Contact Name" value={values.contactName} onChange={setField("contactName")} />
            <TextField id="customer-email" label="Email" type="email" value={values.email} onChange={setField("email")} />
            <TextField id="customer-phone" label="Phone" type="tel" value={values.phone} onChange={setField("phone")} />
          </div>
        </RecordFormSection>
        <RecordFormSection number="02" title="Billing details" description="Add an address, tax number or private note when you need them.">
          <details className="record-form-disclosure" open={isNew ? undefined : true}>
            <summary>Address, tax and notes <span>Optional</span></summary>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <TextField id="customer-address-1" label="Address Line 1" value={values.addressLine1} onChange={setField("addressLine1")} />
              <TextField id="customer-address-2" label="Address Line 2" value={values.addressLine2} onChange={setField("addressLine2")} />
              <TextField id="customer-city" label="City" value={values.city} onChange={setField("city")} />
              <TextField id="customer-state" label="State / Province" value={values.state} onChange={setField("state")} />
              <TextField id="customer-postal-code" label="Postal Code" value={values.postalCode} onChange={setField("postalCode")} />
              <TextField id="customer-country" label="Country" value={values.country} onChange={setField("country")} maxLength={2} />
              <TextField id="customer-tax-number" label="Tax Number" value={values.taxNumber} onChange={setField("taxNumber")} />
              <div className="flex flex-col gap-1 sm:col-span-2">
                <label htmlFor="customer-notes" className="text-sm text-ink">Notes</label>
                <textarea id="customer-notes" value={values.notes} onChange={setField("notes")} rows={3}
                  className="workspace-field min-h-11 rounded-lg border px-3 py-2 text-sm text-ink" />
              </div>
            </div>
          </details>
        </RecordFormSection>
        <RecordFormActions pending={submitting} label={submitLabel} cancelHref={isNew ? "/customers" : undefined} />
      </form>
    </RecordFormLayout>
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
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        maxLength={maxLength}
        onChange={onChange}
        className="workspace-field min-h-11 rounded-lg border border-border px-3 py-2 text-sm text-ink"
      />
    </div>
  );
}
