import { afterEach, describe, expect, it, vi } from "vitest";
import { getHostedInvoice, hostedInvoicePdfUrl } from "./hostedInvoice";

const SAMPLE: import("./hostedInvoice").HostedInvoice = {
  businessName: "Acme Pty Ltd",
  logoUrl: "/api/v1/business/logo/business-1",
  invoiceNumber: "INV-000123",
  status: "Sent",
  issueDate: "2026-09-01",
  dueDate: "2026-09-15",
  currency: "AUD",
  totalAmount: 220,
  amountDue: 220,
};

describe("getHostedInvoice", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the parsed hosted invoice on a successful response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(SAMPLE) }));

    await expect(getHostedInvoice("qk6XMgWUVz9KbfJP")).resolves.toEqual(SAMPLE);
  });

  it("throws a generic message when the response is not ok, without leaking why (IG-215)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({ detail: "some internal detail" }) }));

    // Deliberately does NOT surface response.json()'s "detail" - unlike every other lib/*.ts
    // fetch wrapper in this app, an unsuccessful hosted-invoice lookup must never expose
    // server-side detail about *why* it failed (IG-215 AC).
    await expect(getHostedInvoice("does-not-exist")).rejects.toThrow(/could not be found/);
  });

  it("URL-encodes the token in the request", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(SAMPLE) });
    vi.stubGlobal("fetch", fetchMock);

    await getHostedInvoice("a token/with?special&chars");

    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining(encodeURIComponent("a token/with?special&chars")));
  });
});

describe("hostedInvoicePdfUrl", () => {
  it("builds the PDF endpoint URL with the encoded token", () => {
    expect(hostedInvoicePdfUrl("qk6XMgWUVz9KbfJP")).toBe("http://localhost:5094/api/v1/public/invoices/qk6XMgWUVz9KbfJP/pdf");
  });
});
