import { afterEach, describe, expect, it, vi } from "vitest";
import { archiveCustomer, createCustomer, getCustomer, listCustomers, updateCustomer } from "./customers";

const sampleCustomer = {
  id: "c1",
  businessName: "Acme Pty Ltd",
  contactName: "Jamie Lee",
  email: "billing@acme.example",
  phone: null,
  addressLine1: null,
  addressLine2: null,
  city: null,
  state: null,
  postalCode: null,
  country: null,
  taxNumber: null,
  notes: null,
  isArchived: false,
  createdAt: "2026-08-01T00:00:00Z",
  updatedAt: "2026-08-01T00:00:00Z",
};

const sampleRequest = {
  businessName: "Acme Pty Ltd",
  contactName: "Jamie Lee",
  email: "billing@acme.example",
  phone: null,
  addressLine1: null,
  addressLine2: null,
  city: null,
  state: null,
  postalCode: null,
  country: null,
  taxNumber: null,
  notes: null,
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("listCustomers", () => {
  it("sends credentials: include and returns the parsed list", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve([sampleCustomer]) });
    vi.stubGlobal("fetch", fetchMock);

    const result = await listCustomers();

    expect(result).toEqual([sampleCustomer]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("includeArchived=false");
    expect(init.credentials).toBe("include");
  });

  it("requests archived customers when asked", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve([]) });
    vi.stubGlobal("fetch", fetchMock);

    await listCustomers(true);

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain("includeArchived=true");
  });

  it("throws the server's error detail on failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({ detail: "Your session has expired. Please sign in again." }) }));

    await expect(listCustomers()).rejects.toThrow("Your session has expired. Please sign in again.");
  });
});

describe("getCustomer", () => {
  it("returns the parsed customer on success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(sampleCustomer) }));

    await expect(getCustomer("c1")).resolves.toEqual(sampleCustomer);
  });

  it("falls back to a generic message when the error response has no detail", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: () => Promise.reject(new Error("not json")) }));

    await expect(getCustomer("missing")).rejects.toThrow("Failed to load this customer.");
  });
});

describe("createCustomer", () => {
  it("posts the request with credentials included", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(sampleCustomer) });
    vi.stubGlobal("fetch", fetchMock);

    const result = await createCustomer(sampleRequest);

    expect(result).toEqual(sampleCustomer);
    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("include");
    expect(JSON.parse(init.body)).toEqual(sampleRequest);
  });

  it("throws the server's error detail on validation failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({ detail: "Customer name is required." }) }));

    await expect(createCustomer(sampleRequest)).rejects.toThrow("Customer name is required.");
  });
});

describe("updateCustomer", () => {
  it("puts the request with credentials included", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(sampleCustomer) });
    vi.stubGlobal("fetch", fetchMock);

    await updateCustomer("c1", sampleRequest);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/api/v1/customers/c1");
    expect(init.method).toBe("PUT");
    expect(init.credentials).toBe("include");
  });
});

describe("archiveCustomer", () => {
  it("sends a DELETE with credentials included", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await archiveCustomer("c1");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/api/v1/customers/c1");
    expect(init.method).toBe("DELETE");
    expect(init.credentials).toBe("include");
  });

  it("throws the server's error detail on failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({ detail: "Customer not found." }) }));

    await expect(archiveCustomer("missing")).rejects.toThrow("Customer not found.");
  });
});
