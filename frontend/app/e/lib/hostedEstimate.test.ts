import { afterEach, describe, expect, it, vi } from "vitest";
import { getHostedEstimate, hostedEstimatePdfUrl } from "./hostedEstimate";

const SAMPLE: import("./hostedEstimate").HostedEstimate = {
  businessName: "Acme Pty Ltd",
  logoUrl: "/api/v1/business/logo/business-1",
  estimateNumber: "EST-000123",
  status: "Sent",
  issueDate: "2026-09-01",
  expiryDate: "2026-09-15",
  currency: "AUD",
  totalAmount: 220,
};

describe("getHostedEstimate", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the parsed hosted estimate on a successful response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(SAMPLE) }));

    await expect(getHostedEstimate("qk6XMgWUVz9KbfJP")).resolves.toEqual(SAMPLE);
  });

  it("throws a generic message when the response is not ok, without leaking why", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({ detail: "some internal detail" }) }));

    await expect(getHostedEstimate("does-not-exist")).rejects.toThrow(/could not be found/);
  });

  it("URL-encodes the token in the request", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(SAMPLE) });
    vi.stubGlobal("fetch", fetchMock);

    await getHostedEstimate("a token/with?special&chars");

    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining(encodeURIComponent("a token/with?special&chars")));
  });
});

describe("hostedEstimatePdfUrl", () => {
  it("builds the PDF endpoint URL with the encoded token", () => {
    expect(hostedEstimatePdfUrl("qk6XMgWUVz9KbfJP")).toBe("http://localhost:5094/api/v1/public/estimates/qk6XMgWUVz9KbfJP/pdf");
  });
});
