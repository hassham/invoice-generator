import { useId, type ChangeEvent, type FocusEvent } from "react";
import type { FieldConfig } from "../lib/fields";

interface FormFieldProps {
  field: FieldConfig;
  value: string;
  error?: string;
  onChange: (name: string, value: string) => void;
  onBlur: (name: string) => void;
}

/**
 * A single labelled input. Validation errors are shown on blur (IG-116: "field-level errors
 * identify corrections") but the typed value is always passed straight through to the parent's
 * state via onChange - this component never clears or overwrites it, valid or not, which is what
 * guarantees "valid values survive rejected submissions".
 */
export function FormField({ field, value, error, onChange, onBlur }: FormFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const inputType = field.type === "email" || field.type === "url" || field.type === "date" ? field.type : "text";

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(field.name, event.target.value);
  };

  const handleBlur = (_event: FocusEvent<HTMLInputElement>) => {
    onBlur(field.name);
  };

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {field.label}
        {field.required ? <span aria-hidden="true"> *</span> : null}
      </label>
      <input
        id={id}
        type={inputType}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        maxLength={inputType === "text" ? field.maxLength : undefined}
        required={field.required}
        aria-required={field.required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={
          error
            ? "rounded-md border border-red-500 px-3 py-2 text-sm text-slate-950"
            : "rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950"
        }
      />
      {error ? (
        <p id={errorId} role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
