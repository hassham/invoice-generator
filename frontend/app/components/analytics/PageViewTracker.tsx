"use client";

import { useEffect } from "react";
import { resolveAcquisitionSource, track } from "../../../lib/analytics";

export function PageViewTracker() {
  useEffect(() => {
    const source = resolveAcquisitionSource(
      document.referrer,
      new URLSearchParams(window.location.search),
      window.location.hostname,
    );
    track({ name: "landing_page_view", properties: { source } });
    // Fire once for this page load only - not on every re-render.
  }, []);

  return null;
}
