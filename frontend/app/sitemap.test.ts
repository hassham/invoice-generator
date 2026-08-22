import { describe, expect, it } from "vitest";
import sitemap from "./sitemap";

describe("sitemap.xml", () => {
  it("lists the public landing page", () => {
    const result = sitemap();
    expect(result).toHaveLength(1);
    expect(result[0].url).toBe("http://localhost:3000");
  });

  it("does not list any authenticated application route", () => {
    const result = sitemap();
    const authenticatedAppRoutes = ["/dashboard", "/documents", "/customers", "/items", "/settings", "/templates"];
    result.forEach((entry) => {
      authenticatedAppRoutes.forEach((route) => {
        expect(entry.url).not.toContain(route);
      });
    });
  });
});
