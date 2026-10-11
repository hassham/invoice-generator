import { render, screen, act } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, it, expect, beforeEach } from "vitest";
import { BusinessProvider, useSelectedBusiness } from "./BusinessContext";

function Probe() {
  const { selectedBusinessId, selectBusiness, clearSelection } = useSelectedBusiness();
  return (
    <div>
      <p>selected: {selectedBusinessId ?? "none"}</p>
      <button onClick={() => selectBusiness("biz-2")}>select biz-2</button>
      <button onClick={clearSelection}>clear</button>
    </div>
  );
}

describe("BusinessProvider", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("starts with no business selected when nothing is stored", () => {
    render(
      <BusinessProvider>
        <Probe />
      </BusinessProvider>
    );

    expect(screen.getByText("selected: none")).toBeInTheDocument();
  });

  it("picks up a business id that was stored by an earlier visit", () => {
    window.localStorage.setItem("selectedBusinessId", "biz-1");

    render(
      <BusinessProvider>
        <Probe />
      </BusinessProvider>
    );

    expect(screen.getByText("selected: biz-1")).toBeInTheDocument();
  });

  it("persists a selection to localStorage", async () => {
    render(
      <BusinessProvider>
        <Probe />
      </BusinessProvider>
    );

    await userEvent.click(screen.getByRole("button", { name: "select biz-2" }));

    expect(screen.getByText("selected: biz-2")).toBeInTheDocument();
    expect(window.localStorage.getItem("selectedBusinessId")).toBe("biz-2");
  });

  it("clears the selection and the stored value", async () => {
    window.localStorage.setItem("selectedBusinessId", "biz-1");
    render(
      <BusinessProvider>
        <Probe />
      </BusinessProvider>
    );

    await userEvent.click(screen.getByRole("button", { name: "clear" }));

    expect(screen.getByText("selected: none")).toBeInTheDocument();
    expect(window.localStorage.getItem("selectedBusinessId")).toBeNull();
  });

  it("follows a selection made in another tab", () => {
    render(
      <BusinessProvider>
        <Probe />
      </BusinessProvider>
    );

    act(() => {
      window.localStorage.setItem("selectedBusinessId", "biz-9");
      window.dispatchEvent(new StorageEvent("storage", { key: "selectedBusinessId", newValue: "biz-9" }));
    });

    expect(screen.getByText("selected: biz-9")).toBeInTheDocument();
  });

  it("throws when used outside the provider", () => {
    const originalError = console.error;
    console.error = () => {};
    try {
      expect(() => render(<Probe />)).toThrow("useSelectedBusiness must be used within BusinessProvider");
    } finally {
      console.error = originalError;
    }
  });
});
