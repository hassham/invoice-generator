import { afterEach, describe, expect, it, vi } from "vitest";
import { acceptEstimate, declineEstimate, getHostedEstimate, hostedEstimatePdfUrl } from "./hostedEstimate";

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

describe("acceptEstimate", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("POSTs to the accept endpoint and returns the updated estimate", async () => {
    const accepted = { ...SAMPLE, status: "Accepted" };
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(accepted) });
    vi.stubGlobal("fetch", fetchMock);

    await expect(acceptEstimate("qk6XMgWUVz9KbfJP")).resolves.toEqual(accepted);
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:5094/api/v1/public/estimates/qk6XMgWUVz9KbfJP/accept", { method: "POST" });
  });

  it("surfaces the server's detail message on failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({ detail: "This estimate has already been declined and can no longer be accepted." }) }));

    await expect(acceptEstimate("qk6XMgWUVz9KbfJP")).rejects.toThrow("This estimate has already been declined and can no longer be accepted.");
  });

  it("falls back to a generic message when no detail is present", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: () => Promise.reject(new Error("no body")) }));

    await expect(acceptEstimate("qk6XMgWUVz9KbfJP")).rejects.toThrow(/can't be accepted right now/);
  });
});

describe("declineEstimate", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("POSTs to the decline endpoint and returns the updated estimate", async () => {
    const declined = { ...SAMPLE, status: "Declined" };
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(declined) });
    vi.stubGlobal("fetch", fetchMock);

    await expect(declineEstimate("qk6XMgWUVz9KbfJP")).resolves.toEqual(declined);
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:5094/api/v1/public/estimates/qk6XMgWUVz9KbfJP/decline", { method: "POST" });
  });

  it("falls back to a generic message when no detail is present", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: () => Promise.reject(new Error("no body")) }));

    await expect(declineEstimate("qk6XMgWUVz9KbfJP")).rejects.toThrow(/can't be declined right now/);
  });
});
