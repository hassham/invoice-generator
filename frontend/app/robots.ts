import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// FSD.md documents these as the authenticated application's routes (sections 42, 45, 55, 56, 59,
// 62, 73). None are built yet - Authentication and Dashboard are later Epics - but disallowing
// them now means indexing stays excluded from the moment each route ships, per-page `noindex`
// metadata should still be added to each as defense-in-depth once built, since robots.txt is
// advisory only, not access control.
const authenticatedAppRoutes = ["/dashboard", "/documents", "/customers", "/items", "/settings", "/templates"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: authenticatedAppRoutes,
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
