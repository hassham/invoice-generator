"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { track } from "../../../lib/analytics";

type EntryPoint = "hero" | "pricing_free_plan";

interface AnalyticsCtaLinkProps extends ComponentProps<typeof Link> {
  entryPoint: EntryPoint;
}

export function AnalyticsCtaLink({ entryPoint, onClick, ...linkProps }: AnalyticsCtaLinkProps) {
  return (
    <Link
      {...linkProps}
      onClick={(event) => {
        track({ name: "invoice_editor_start", properties: { entryPoint } });
        onClick?.(event);
      }}
    />
  );
}
