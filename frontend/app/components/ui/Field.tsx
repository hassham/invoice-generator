import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";
import { cn } from "./cn";

/**
 * IG-327: form controls (docs/BRANDINGGUIDELINES.md section 13). Labels are always visible above the
 * control; placeholders are never the only label. Errors are text, not colour alone.
 */
const control =
  "w-full rounded-lg border border-border bg-paper px-3 py-2 font-sans text-sm text-ink placeholder:text-muted " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:border-ink " +
  "disabled:cursor-not-allowed disabled:opacity-50";

interface FieldShellProps {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
}

/** Label, control, hint and error for one field. Wires aria-describedby to the hint and error text. */
export function Field({ id, label, required, hint, error, children }: FieldShellProps) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-sans text-sm font-semibold text-ink">
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      {children}
      {hint && !error ? (
        <p id={hintId} className="font-sans text-xs text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="font-sans text-xs font-semibold text-[#991b1b]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export function Input({ className, error, ...props }: InputProps) {
  return (
    <input
      aria-invalid={error ? true : undefined}
      className={cn(control, error && "border-[#991b1b]", className)}
      {...props}
    />
  );
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export function Select({ className, error, children, ...props }: SelectProps) {
  return (
    <select
      aria-invalid={error ? true : undefined}
      className={cn(control, "pr-8", error && "border-[#991b1b]", className)}
      {...props}
    >
      {children}
    </select>
  );
}

/** A checkbox with its own visible label, so the label is never a tooltip or placeholder. */
export function Checkbox({ id, label, hint, ...props }: InputHTMLAttributes<HTMLInputElement> & { id: string; label: string; hint?: string }) {
  const hintId = `${id}-hint`;
  return (
    <div className="flex items-start gap-3">
      <input
        id={id}
        type="checkbox"
        aria-describedby={hint ? hintId : undefined}
        className="mt-0.5 h-5 w-5 rounded border-[1.5px] border-ink accent-[#171717] focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
        {...props}
      />
      <div className="flex flex-col gap-0.5">
        <label htmlFor={id} className="font-sans text-sm font-medium text-ink">
          {label}
        </label>
        {hint ? (
          <p id={hintId} className="font-sans text-xs text-muted">
            {hint}
          </p>
        ) : null}
      </div>
    </div>
  );
}
