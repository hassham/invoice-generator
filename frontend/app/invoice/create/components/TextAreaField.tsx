import { useId, type ChangeEvent } from "react";
import type { FieldConfig } from "../lib/fields";

interface TextAreaFieldProps {
  field: FieldConfig;
  value: string;
  error?: string;
  rows?: number;
  onChange: (name: string, value: string) => void;
  onBlur: (name: string) => void;
}

/**
 * Multiline sibling of FormField - same contract (blur-then-validate, value always passed
 * straight through, never cleared), for the long-form content fields (Notes, Terms and
 * Conditions, Custom Instructions) that don't fit a single-line input.
 */
export function TextAreaField({ field, value, error, rows = 4, onChange, onBlur }: TextAreaFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onChange(field.name, event.target.value);
  };

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {field.label}
        {field.required ? <span aria-hidden="true"> *</span> : null}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={handleChange}
        onBlur={() => onBlur(field.name)}
        rows={rows}
        maxLength={field.maxLength}
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
