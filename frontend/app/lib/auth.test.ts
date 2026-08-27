import { afterEach, describe, expect, it, vi } from "vitest";
import { getCurrentSession, login, logout, registerAccount } from "./auth";

describe("registerAccount", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sends credentials: include and returns the parsed account on success", async () => {
    const account = { userId: "u1", email: "jane@example.com", name: "Jane", businessId: "b1" };
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(account) });
    vi.stubGlobal("fetch", fetchMock);

    const result = await registerAccount({ email: "jane@example.com", password: "Passw0rd!", confirmPassword: "Passw0rd!", name: "Jane" });

    expect(result).toEqual(account);
    const [, init] = fetchMock.mock.calls[0];
    expect(init.credentials).toBe("include");
    expect(init.method).toBe("POST");
  });

  it("throws the server's error detail when registration fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({ detail: "An account with this email already exists." }) }),
    );

    await expect(
      registerAccount({ email: "jane@example.com", password: "Passw0rd!", confirmPassword: "Passw0rd!", name: null }),
    ).rejects.toThrow("An account with this email already exists.");
  });

  it("falls back to a generic message when the error response has no detail", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: () => Promise.reject(new Error("not json")) }));

    await expect(
      registerAccount({ email: "jane@example.com", password: "Passw0rd!", confirmPassword: "Passw0rd!", name: null }),
    ).rejects.toThrow("Failed to create your account.");
  });
});

describe("login", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sends credentials: include and returns the logged-in account on success", async () => {
    const account = { userId: "u1", email: "jane@example.com", name: "Jane" };
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(account) });
    vi.stubGlobal("fetch", fetchMock);

    const result = await login({ email: "jane@example.com", password: "Passw0rd!", rememberMe: true });

    expect(result).toEqual(account);
    const [, init] = fetchMock.mock.calls[0];
    expect(init.credentials).toBe("include");
  });

  it("throws the server's error detail on incorrect credentials", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({ detail: "Incorrect email or password." }) }),
    );

    await expect(login({ email: "jane@example.com", password: "wrong", rememberMe: false })).rejects.toThrow(
      "Incorrect email or password.",
    );
  });
});

describe("getCurrentSession", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns the account when a session exists", async () => {
    const account = { userId: "u1", email: "jane@example.com", name: "Jane" };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(account) }));

    await expect(getCurrentSession()).resolves.toEqual(account);
  });

  it("returns null when there is no session", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve(null) }));

    await expect(getCurrentSession()).resolves.toBeNull();
  });
});

describe("logout", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("posts to the logout endpoint with credentials included", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await logout();

    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("include");
  });
});
