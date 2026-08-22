import { describe, expect, it } from "vitest";
import robots from "./robots";

describe("robots.txt", () => {
  it("allows public content to be crawled by every user agent", () => {
    const result = robots();
    expect(result.rules).toEqual(expect.objectContaining({ userAgent: "*", allow: "/" }));
  });

  it("excludes every authenticated application route documented in docs/FSD.md", () => {
    const result = robots();
    const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    const disallow = rules.disallow;
    // FSD 42, 45, 55, 56, 59, 62, 73 - none of these routes are built yet, but staying
    // excluded from the moment they ship is the point of asserting this today.
    ["/dashboard", "/documents", "/customers", "/items", "/settings", "/templates"].forEach((route) => {
      expect(disallow).toContain(route);
    });
  });

  it("does not exclude public acquisition routes", () => {
    const result = robots();
    const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    const disallow = rules.disallow;
    // /invoice/create is the anonymous-usable acquisition funnel (docs/PRD.md section 25) -
    // it must stay crawlable, not get swept up alongside the authenticated app routes.
    ["/", "/invoice/create", "/login", "/signup"].forEach((route) => {
      expect(disallow).not.toContain(route);
    });
  });

  it("references the sitemap", () => {
    const result = robots();
    expect(result.sitemap).toBe("http://localhost:3000/sitemap.xml");
  });
});
