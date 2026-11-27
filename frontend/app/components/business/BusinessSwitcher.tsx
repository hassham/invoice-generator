"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { listBusinesses, readSelectedBusinessId, setSelectedBusinessId, type BusinessProfile } from "../../lib/business";

/**
 * IG-238: the header's business switcher. Lists the account's businesses and changes which one the
 * app works on. The change reloads the page so every screen fetches for the newly chosen business.
 * Renders nothing when the list can't be loaded, so the header never breaks because of it.
 */
export function BusinessSwitcher({ mobile = false, onNavigate }: { mobile?: boolean; onNavigate?: () => void } = {}) {
  const selectId = useId();
  const [businesses, setBusinesses] = useState<BusinessProfile[]>([]);

  useEffect(() => {
    let cancelled = false;
    listBusinesses()
      .then((loaded) => {
        if (!cancelled) {
          setBusinesses(Array.isArray(loaded) ? loaded : []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBusinesses([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (businesses.length === 0) {
    return null;
  }

  // With no stored choice the app uses the account's first business, which is the first in the list.
  // Read during render: the switcher only mounts after sign-in, so the server never renders it and
  // the stored choice can't cause a hydration mismatch.
  const storedId = readSelectedBusinessId();
  const effectiveId = storedId && businesses.some((business) => business.id === storedId) ? storedId : businesses[0].id;

  const handleChange = (businessId: string) => {
    setSelectedBusinessId(businessId);
    window.location.reload();
  };

  return (
    <div className={`flex min-w-0 items-center gap-2 ${mobile ? "px-2" : ""}`}>
      <label htmlFor={selectId} className={mobile ? "shrink-0 text-sm font-medium text-ink" : "sr-only"}>
        Business
      </label>
      <select
        id={selectId}
        value={effectiveId}
        onChange={(event) => handleChange(event.target.value)}
        className={`workspace-field min-h-10 truncate rounded-lg border border-border px-2 py-1.5 text-sm text-ink ${mobile ? "flex-1" : "w-40"}`}
      >
        {businesses.map((business) => (
          <option key={business.id} value={business.id}>
            {business.businessName}
          </option>
        ))}
      </select>
      <Link href="/businesses" onClick={onNavigate} className="shrink-0 rounded-sm text-sm font-semibold text-ink underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">
        Manage
      </Link>
    </div>
  );
}
