import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "./LoginForm";

function stubLocation(search: string) {
  window.history.pushState({}, "", `/login${search}`);
}

describe("LoginForm", () => {
  const originalLocation = window.location;

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    Object.defineProperty(window, "location", { configurable: true, writable: true, value: originalLocation });
    window.history.pushState({}, "", "/login");
  });

  it("submits email, password and rememberMe, then navigates home on success", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ userId: "u1", email: "jane@example.com", name: "Jane" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const navigations: string[] = [];
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: { ...originalLocation, set href(value: string) { navigations.push(value); } },
    });
    const user = userEvent.setup();

    render(<LoginForm />);
    await user.type(screen.getByLabelText("Email"), "jane@example.com");
    await user.type(screen.getByLabelText("Password"), "Passw0rd!");
    await user.click(screen.getByLabelText("Remember me"));
    await user.click(screen.getByRole("button", { name: "Log in" }));

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/auth/login"),
      expect.objectContaining({
        credentials: "include",
        body: JSON.stringify({ email: "jane@example.com", password: "Passw0rd!", rememberMe: true }),
      }),
    );
    expect(navigations).toContain("/");
  });

  it("shows the server's error message when login fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({ detail: "Incorrect email or password." }) }),
    );
    const user = userEvent.setup();

    render(<LoginForm />);
    await user.type(screen.getByLabelText("Email"), "jane@example.com");
    await user.type(screen.getByLabelText("Password"), "wrong");
    await user.click(screen.getByRole("button", { name: "Log in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Incorrect email or password.");
  });

  it("shows the session-expired message when arriving with ?sessionExpired=1", async () => {
    stubLocation("?sessionExpired=1");
    vi.stubGlobal("fetch", vi.fn());

    render(<LoginForm />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Your session has expired. Please sign in again.");
  });

  it("does not show the session-expired message on a normal visit", () => {
    render(<LoginForm />);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
