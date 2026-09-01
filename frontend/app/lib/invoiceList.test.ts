import { afterEach, describe, expect, it, vi } from "vitest";
import { listInvoices } from "./invoiceList";

const sampleResult = {
  items: [
    { id: "inv-1", invoiceNumber: "INV-0001", customerName: "Acme Pty Ltd", status: "Draft", issueDate: "2026-08-01", dueDate: "2026-08-15", currency: "AUD", totalAmount: 220, amountDue: 220 },
  ],
  page: 1,
  pageSize: 25,
  totalCount: 1,
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("listInvoices", () => {
  it("sends credentials: include and page/pageSize as query params", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(sampleResult) });
    vi.stubGlobal("fetch", fetchMock);

    const result = await listInvoices(2, 50);

    expect(result).toEqual(sampleResult);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/api/v1/invoices?page=2&pageSize=50");
    expect(init.credentials).toBe("include");
  });

  it("throws the server's error detail on failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({ detail: "Your session has expired. Please sign in again." }) }));

    await expect(listInvoices(1, 25)).rejects.toThrow("Your session has expired. Please sign in again.");
  });

  it("falls back to a generic message when the error response has no detail", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: () => Promise.reject(new Error("not json")) }));

    await expect(listInvoices(1, 25)).rejects.toThrow("Failed to load invoices.");
  });
});
