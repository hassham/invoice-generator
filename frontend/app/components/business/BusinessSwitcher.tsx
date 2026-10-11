"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listBusinesses, readSelectedBusinessId, setSelectedBusinessId, type BusinessProfile } from "../../lib/business";

/**
 * IG-238: the header's business switcher. Lists the account's businesses and changes which one the
 * app works on. The change reloads the page so every screen fetches for the newly chosen business.
 * Renders nothing when the list can't be loaded, so the header never breaks because of it.
 */
export function BusinessSwitcher() {
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
    <div className="flex items-center gap-2">
      <label htmlFor="business-switcher" className="sr-only">
        Business
      </label>
      <select
        id="business-switcher"
        value={effectiveId}
        onChange={(event) => handleChange(event.target.value)}
        className="max-w-[12rem] truncate rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700"
      >
        {businesses.map((business) => (
          <option key={business.id} value={business.id}>
            {business.businessName}
          </option>
        ))}
      </select>
      <Link href="/businesses" className="text-sm font-medium text-indigo-700 hover:text-indigo-900">
        Manage
      </Link>
    </div>
  );
}
