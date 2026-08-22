import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resetAnalyticsSink, setAnalyticsSink } from "../../../lib/analytics";
import type { AnalyticsSink } from "../../../lib/analytics";
import { PageViewTracker } from "./PageViewTracker";

describe("PageViewTracker", () => {
  afterEach(() => {
    resetAnalyticsSink();
  });

  it("emits exactly one landing_page_view event on mount, with a resolved source", () => {
    const sink: AnalyticsSink = { track: vi.fn() };
    setAnalyticsSink(sink);

    render(<PageViewTracker />);

    expect(sink.track).toHaveBeenCalledTimes(1);
    expect(sink.track).toHaveBeenCalledWith({
      name: "landing_page_view",
      properties: { source: expect.any(Object) },
    });
  });

  it("renders nothing visible", () => {
    setAnalyticsSink({ track: vi.fn() });
    const { container } = render(<PageViewTracker />);
    expect(container).toBeEmptyDOMElement();
  });
});
