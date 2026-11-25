import type { HTMLAttributes } from "react";
import { cn } from "./cn";

/**
 * IG-327: application card (docs/BRANDINGGUIDELINES.md section 12). Controlled radius, paper surface,
 * 1px border. Use only where it improves grouping; do not wrap every item in a card.
 */
export type CardTone = "paper" | "lavender" | "yellow" | "mint" | "pink" | "peach";

const tones: Record<CardTone, string> = {
  paper: "bg-paper",
  lavender: "bg-lavender",
  yellow: "bg-yellow",
  mint: "bg-mint",
  pink: "bg-pink",
  peach: "bg-peach",
};

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  tone?: CardTone;
}

export function Card({ tone = "paper", className, ...props }: CardProps) {
  return <div className={cn("rounded-2xl border border-border p-6 text-ink", tones[tone], className)} {...props} />;
}
