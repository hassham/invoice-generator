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
 * Shared rendering for Seller (FSD section 13) and Customer (FSD section 15) details - the two
 * field sets differ (Seller has Website/Registration Number, Customer doesn't) but the layout and
 * behaviour are identical, so this is data-driven from whichever FieldConfig[] is passed in
 * rather than duplicated per party.
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
