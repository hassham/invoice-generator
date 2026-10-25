import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GuestOnlyContent } from "./GuestOnlyContent";

const replace = vi.fn();
const getCurrentSession = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

vi.mock("../../lib/auth", () => ({
  getCurrentSession: () => getCurrentSession(),
}));

describe("GuestOnlyContent", () => {
  beforeEach(() => {
    replace.mockReset();
    getCurrentSession.mockReset();
  });

  it("shows its content to a signed-out visitor", async () => {
    getCurrentSession.mockResolvedValue(null);

    render(<GuestOnlyContent>Marketing page</GuestOnlyContent>);

    expect(await screen.findByText("Marketing page")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("sends a signed-in account to the dashboard and never shows the content", async () => {
    getCurrentSession.mockResolvedValue({ userId: "u1", email: "a@example.com", name: null });

    render(<GuestOnlyContent>Marketing page</GuestOnlyContent>);

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard"));
    expect(screen.queryByText("Marketing page")).not.toBeInTheDocument();
  });

  it("treats a failed session check as a guest so the page still loads", async () => {
    getCurrentSession.mockRejectedValue(new Error("network down"));

    render(<GuestOnlyContent>Marketing page</GuestOnlyContent>);

    expect(await screen.findByText("Marketing page")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("renders nothing while the session check is still running", () => {
    getCurrentSession.mockReturnValue(new Promise(() => {}));

    render(<GuestOnlyContent>Marketing page</GuestOnlyContent>);

    expect(screen.queryByText("Marketing page")).not.toBeInTheDocument();
  });
});
