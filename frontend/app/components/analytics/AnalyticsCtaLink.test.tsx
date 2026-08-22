import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resetAnalyticsSink, setAnalyticsSink } from "../../../lib/analytics";
import type { AnalyticsSink } from "../../../lib/analytics";
import { AnalyticsCtaLink } from "./AnalyticsCtaLink";

describe("AnalyticsCtaLink", () => {
  afterEach(() => {
    resetAnalyticsSink();
  });

  it("emits invoice_editor_start with the given entry point on click", async () => {
    const sink: AnalyticsSink = { track: vi.fn() };
    setAnalyticsSink(sink);
    const user = userEvent.setup();

    render(
      <AnalyticsCtaLink href="/invoice/create" entryPoint="hero">
        Create Free Invoice
      </AnalyticsCtaLink>,
    );
    await user.click(screen.getByRole("link", { name: "Create Free Invoice" }));

    expect(sink.track).toHaveBeenCalledWith({
      name: "invoice_editor_start",
      properties: { entryPoint: "hero" },
    });
  });

  it("still renders the link and does not crash the click when the sink throws (IG-90: never block navigation)", async () => {
    setAnalyticsSink({
      track: () => {
        throw new Error("analytics endpoint unreachable");
      },
    });
    const user = userEvent.setup();

    render(
      <AnalyticsCtaLink href="/invoice/create" entryPoint="pricing_free_plan">
        Create Free Invoice
      </AnalyticsCtaLink>,
    );
    const link = screen.getByRole("link", { name: "Create Free Invoice" });

    await expect(user.click(link)).resolves.not.toThrow();
    // The link element is still intact and clickable afterward - a real navigation would not
    // have been aborted by the sink failure.
    expect(screen.getByRole("link", { name: "Create Free Invoice" })).toHaveAttribute(
      "href",
      "/invoice/create",
    );
  });
});
