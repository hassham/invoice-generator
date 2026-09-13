import { afterEach, describe, expect, it, vi } from "vitest";
import { parseEmailList, sendInvoiceEmail } from "./invoiceEmail";

describe("parseEmailList", () => {
  it("splits on commas and newlines, trimming whitespace", () => {
    expect(parseEmailList("a@example.com, b@example.com\nc@example.com")).toEqual([
      "a@example.com",
      "b@example.com",
      "c@example.com",
    ]);
  });

  it("drops empty entries from trailing separators or blank lines", () => {
    expect(parseEmailList("a@example.com,,\n\n")).toEqual(["a@example.com"]);
  });

  it("returns an empty list for blank input", () => {
    expect(parseEmailList("   ")).toEqual([]);
  });
});

describe("sendInvoiceEmail", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts the request with credentials included", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(null) });
    vi.stubGlobal("fetch", fetchMock);

    await sendInvoiceEmail("invoice-1", { to: ["a@example.com"], cc: [], subject: "Invoice", message: "Hi" });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/invoices/invoice-1/send-email"),
      expect.objectContaining({ method: "POST", credentials: "include" }),
    );
  });

  it("throws the server's detail message on failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({ detail: "At least one recipient is required." }) }));

    await expect(sendInvoiceEmail("invoice-1", { to: [], cc: [], subject: "", message: "" })).rejects.toThrow(
      "At least one recipient is required.",
    );
  });

  it("falls back to a generic message when the error response has no detail", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve(null) }));

    await expect(sendInvoiceEmail("invoice-1", { to: ["a@example.com"], cc: [], subject: "Invoice", message: "Hi" })).rejects.toThrow(
      "Failed to send this invoice.",
    );
  });
});
