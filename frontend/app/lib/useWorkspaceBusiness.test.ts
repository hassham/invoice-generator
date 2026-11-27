import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useWorkspaceBusiness } from "./useWorkspaceBusiness";

const { getBusinessProfile, useSearchParams, useSelectedBusiness } = vi.hoisted(() => ({
  getBusinessProfile: vi.fn(),
  useSearchParams: vi.fn(),
  useSelectedBusiness: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useSearchParams }));
vi.mock("./BusinessContext", () => ({ useSelectedBusiness }));
vi.mock("./business", () => ({ getBusinessProfile }));

describe("useWorkspaceBusiness", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    useSearchParams.mockReturnValue(new URLSearchParams());
    useSelectedBusiness.mockReturnValue({ selectedBusinessId: null });
  });

  it("respects an explicit business on a deep link", () => {
    useSearchParams.mockReturnValue(new URLSearchParams("businessId=linked"));
    useSelectedBusiness.mockReturnValue({ selectedBusinessId: "selected" });
    const { result } = renderHook(useWorkspaceBusiness);
    expect(result.current).toEqual({ businessId: "linked", error: null });
    expect(getBusinessProfile).not.toHaveBeenCalled();
  });

  it("uses the selected business for normal navigation", () => {
    useSelectedBusiness.mockReturnValue({ selectedBusinessId: "selected" });
    const { result } = renderHook(useWorkspaceBusiness);
    expect(result.current).toEqual({ businessId: "selected", error: null });
    expect(getBusinessProfile).not.toHaveBeenCalled();
  });

  it("uses the account default when nothing has been selected", async () => {
    getBusinessProfile.mockResolvedValue({ id: "default" });
    const { result } = renderHook(useWorkspaceBusiness);
    await waitFor(() => expect(result.current).toEqual({ businessId: "default", error: null }));
  });

  it("reports a load error instead of rendering a blank workspace", async () => {
    getBusinessProfile.mockRejectedValue(new Error("Test profile unavailable"));
    const { result } = renderHook(useWorkspaceBusiness);
    await waitFor(() => expect(result.current).toEqual({ businessId: null, error: "Could not load your business profile." }));
  });
});
