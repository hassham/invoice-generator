"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useSelectedBusiness } from "./BusinessContext";
import { getBusinessProfile } from "./business";

/** Route links use the workspace selection; older deep links can still supply an explicit business. */
export function useWorkspaceBusiness() {
  const explicitId = useSearchParams().get("businessId");
  const { selectedBusinessId } = useSelectedBusiness();
  const requestedId = explicitId || selectedBusinessId;
  const [profile, setProfile] = useState<{ id: string | null; error: string | null }>({ id: null, error: null });

  useEffect(() => {
    if (requestedId) return;
    let cancelled = false;
    getBusinessProfile().then(
      (business) => { if (!cancelled) setProfile({ id: business.id, error: null }); },
      () => { if (!cancelled) setProfile({ id: null, error: "Could not load your business profile." }); },
    );
    return () => { cancelled = true; };
  }, [requestedId]);

  return { businessId: requestedId || profile.id, error: requestedId ? null : profile.error };
}
