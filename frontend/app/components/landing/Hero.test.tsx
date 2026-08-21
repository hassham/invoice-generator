import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Hero } from "./Hero";

describe("Hero", () => {
  it("opens the invoice generator route from the primary Create Invoice CTA", () => {
    render(<Hero />);

    const cta = screen.getByRole("link", { name: "Create Free Invoice" });

    expect(cta).toHaveAttribute("href", "/invoice/create");
  });
});
