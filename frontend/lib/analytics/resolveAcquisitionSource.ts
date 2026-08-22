import type { AcquisitionSource } from "./types";

const SEARCH_ENGINES: Array<{ pattern: RegExp; engine: string }> = [
  { pattern: /(^|\.)google\./i, engine: "google" },
  { pattern: /(^|\.)bing\.com$/i, engine: "bing" },
  { pattern: /(^|\.)duckduckgo\.com$/i, engine: "duckduckgo" },
  { pattern: /(^|\.)yahoo\./i, engine: "yahoo" },
];

const UTM_SOURCE_PATTERN = /^[a-z0-9_-]{1,32}$/i;

/**
 * Reduces the raw referrer/query string down to a coarse, approved category - never the full
 * referrer URL or query string, which could carry unrelated personal data from the referring
 * page (IG-90: events must exclude unnecessary personal data).
 */
export function resolveAcquisitionSource(
  referrer: string,
  searchParams: URLSearchParams,
  currentHost: string,
): AcquisitionSource {
  const utmSource = searchParams.get("utm_source");
  if (utmSource && UTM_SOURCE_PATTERN.test(utmSource)) {
    return { type: "utm", value: utmSource.toLowerCase() };
  }

  if (!referrer) {
    return { type: "direct" };
  }

  let referrerHost: string;
  try {
    referrerHost = new URL(referrer).hostname;
  } catch {
    return { type: "direct" };
  }

  if (referrerHost === currentHost) {
    return { type: "direct" };
  }

  const matchedEngine = SEARCH_ENGINES.find(({ pattern }) => pattern.test(referrerHost));
  if (matchedEngine) {
    return { type: "search", engine: matchedEngine.engine };
  }

  return { type: "referral", host: referrerHost };
}
