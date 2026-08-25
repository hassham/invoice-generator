import { useId } from "react";
import { CURRENCY_OPTIONS, HEADER_FIELDS } from "../lib/fields";
import type { FieldErrors, FieldValues } from "../lib/invoiceDraft";
import { FormField } from "./FormField";

interface InvoiceHeaderSectionProps {
  values: FieldValues;
  currency: string;
  errors: FieldErrors;
  onFieldChange: (name: string, value: string) => void;
  onFieldBlur: (name: string) => void;
  onCurrencyChange: (value: string) => void;
}

/** FSD section 12: Invoice Number, Issue Date, Due Date, Currency, Reference / Purchase Order. */
export function InvoiceHeaderSection({
  values,
  currency,
  errors,
  onFieldChange,
  onFieldBlur,
  onCurrencyChange,
}: InvoiceHeaderSectionProps) {
  const currencyId = useId();

  return (
    <fieldset>
      <legend className="text-base font-semibold text-slate-950">Invoice details</legend>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {HEADER_FIELDS.map((field) => (
          <FormField
            key={field.name}
            field={field}
            value={values[field.name] ?? ""}
            error={errors[field.name]}
            onChange={onFieldChange}
            onBlur={onFieldBlur}
          />
        ))}
        <div className="flex flex-col gap-1">
          <label htmlFor={currencyId} className="text-sm font-medium text-slate-700">
            Currency
          </label>
          <select
            id={currencyId}
            value={currency}
            onChange={(event) => onCurrencyChange(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950"
          >
            {CURRENCY_OPTIONS.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </div>
      </div>
    </fieldset>
  );
}
