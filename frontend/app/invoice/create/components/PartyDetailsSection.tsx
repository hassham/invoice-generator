import type { FieldConfig } from "../lib/fields";
import type { FieldErrors, FieldValues } from "../lib/invoiceDraft";
import { FormField } from "./FormField";

interface PartyDetailsSectionProps {
  title: string;
  fields: FieldConfig[];
  values: FieldValues;
  errors: FieldErrors;
  onFieldChange: (name: string, value: string) => void;
  onFieldBlur: (name: string) => void;
}

/**
 * Generic data-driven fieldset - one FormField per FieldConfig in `fields`. Originally shared
 * between Seller and Customer details before IG-193 replaced those with free-text blocks; now used
 * for Payment Instructions (FSD section 32), kept generic in case another structured field group
 * needs it later.
 */
export function PartyDetailsSection({
  title,
  fields,
  values,
  errors,
  onFieldChange,
  onFieldBlur,
}: PartyDetailsSectionProps) {
  return (
    <fieldset className="mt-6 border-t border-slate-200 pt-6">
      <legend className="text-base font-semibold text-slate-950">{title}</legend>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {fields.map((field) => (
          <FormField
            key={field.name}
            field={field}
            value={values[field.name] ?? ""}
            error={errors[field.name]}
            onChange={onFieldChange}
            onBlur={onFieldBlur}
          />
        ))}
      </div>
    </fieldset>
  );
}
