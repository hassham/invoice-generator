"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { getCurrentSession } from "../../lib/auth";

/**
 * Shows its children only to signed-out visitors. A signed-in account is sent to the dashboard
 * instead, so the marketing page never appears for them. Nothing renders until the session check
 * settles, so the page content does not flash before the redirect.
 *
 * If the session check fails (for example the API is unreachable), the visitor is treated as a
 * guest and sees the page as before.
 */
export function GuestOnlyContent({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getCurrentSession()
      .then((account) => {
        if (cancelled) {
          return;
        }
        if (account) {
          router.replace("/dashboard");
        } else {
          setIsGuest(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsGuest(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  return isGuest ? <>{children}</> : null;
}
