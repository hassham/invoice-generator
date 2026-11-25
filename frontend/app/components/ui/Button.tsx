import type { ButtonHTMLAttributes } from "react";
import { cn } from "./cn";

/**
 * IG-327: brand buttons (docs/BRANDINGGUIDELINES.md section 11).
 * - primary: electric lime, ink text, dark outline. One per workflow.
 * - secondary: paper background, dark text, visible outline.
 * - tertiary: minimal text treatment.
 * - destructive: semantic red, for irreversible actions.
 */
export type ButtonVariant = "primary" | "secondary" | "tertiary" | "destructive";
export type ButtonSize = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-sans font-semibold transition-transform duration-150 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 " +
  "disabled:cursor-not-allowed disabled:opacity-50 motion-safe:active:translate-y-px";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-accent text-ink border-[1.5px] border-ink hover:bg-[#c4ee1a]",
  secondary: "bg-paper text-ink border-[1.5px] border-ink hover:bg-canvas",
  tertiary: "bg-transparent text-ink underline-offset-4 hover:underline px-2",
  destructive: "bg-[#991b1b] text-white border-[1.5px] border-[#991b1b] hover:bg-[#7f1d1d]",
};

const sizes: Record<ButtonSize, string> = {
  md: "min-h-10 px-5 py-2 text-sm",
  lg: "min-h-12 px-6 py-3 text-base",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({ variant = "primary", size = "md", className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={cn(base, variants[variant], sizes[size], className)} {...props} />;
}
