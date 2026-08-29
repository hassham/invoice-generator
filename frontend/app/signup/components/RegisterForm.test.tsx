import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { savePendingGateAction } from "../../lib/pendingGateAction";
import { RegisterForm } from "./RegisterForm";

describe("RegisterForm", () => {
  const originalLocation = window.location;

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    Object.defineProperty(window, "location", { configurable: true, writable: true, value: originalLocation });
  });

  it("submits email, password, confirmPassword and name, then navigates home on success", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ userId: "u1", email: "jane@example.com", name: "Jane", businessId: "b1" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const navigations: string[] = [];
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: { ...originalLocation, set href(value: string) { navigations.push(value); } },
    });
    const user = userEvent.setup();

    render(<RegisterForm />);
    await user.type(screen.getByLabelText("Email"), "jane@example.com");
    await user.type(screen.getByLabelText("Name (optional)"), "Jane");
    await user.type(screen.getByLabelText("Password"), "Passw0rd!");
    await user.type(screen.getByLabelText("Confirm password"), "Passw0rd!");
    await user.click(screen.getByRole("button", { name: "Sign up" }));

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/auth/register"),
      expect.objectContaining({
        credentials: "include",
        body: JSON.stringify({ email: "jane@example.com", password: "Passw0rd!", confirmPassword: "Passw0rd!", name: "Jane" }),
      }),
    );
    expect(navigations).toContain("/");
  });

  it("redirects to /invoice/create instead of / when a pending Download/Print action is preserved (IG-31)", async () => {
    savePendingGateAction("print");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ userId: "u1", email: "jane@example.com", name: "Jane", businessId: "b1" }),
      }),
    );
    const navigations: string[] = [];
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: { ...originalLocation, set href(value: string) { navigations.push(value); } },
    });
    const user = userEvent.setup();

    render(<RegisterForm />);
    await user.type(screen.getByLabelText("Email"), "jane@example.com");
    await user.type(screen.getByLabelText("Password"), "Passw0rd!");
    await user.type(screen.getByLabelText("Confirm password"), "Passw0rd!");
    await user.click(screen.getByRole("button", { name: "Sign up" }));

    expect(navigations).toContain("/invoice/create");
  });

  it("rejects a mismatched confirm password without calling the API", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<RegisterForm />);
    await user.type(screen.getByLabelText("Email"), "jane@example.com");
    await user.type(screen.getByLabelText("Password"), "Passw0rd!");
    await user.type(screen.getByLabelText("Confirm password"), "Different1!");
    await user.click(screen.getByRole("button", { name: "Sign up" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Password and confirm password must match.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows the server's error message when registration fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({ detail: "An account with this email already exists." }) }),
    );
    const user = userEvent.setup();

    render(<RegisterForm />);
    await user.type(screen.getByLabelText("Email"), "jane@example.com");
    await user.type(screen.getByLabelText("Password"), "Passw0rd!");
    await user.type(screen.getByLabelText("Confirm password"), "Passw0rd!");
    await user.click(screen.getByRole("button", { name: "Sign up" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("An account with this email already exists.");
  });
});
