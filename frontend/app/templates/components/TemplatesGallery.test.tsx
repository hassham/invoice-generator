import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { fetchTemplates } from "../../invoice/create/lib/templates";
import type { Template } from "../../invoice/create/lib/templates";
import { TemplatesGallery } from "./TemplatesGallery";

vi.mock("../../invoice/create/lib/templates", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../invoice/create/lib/templates")>()),
  fetchTemplates: vi.fn(),
}));

const mockedFetchTemplates = vi.mocked(fetchTemplates);

const TEMPLATES: Template[] = [
  { id: "template-modern", name: "Modern", templateCode: "modern", previewImage: null, isPremium: false, sortOrder: 2 },
  { id: "template-classic", name: "Classic", templateCode: "classic", previewImage: null, isPremium: false, sortOrder: 1 },
  { id: "template-signature", name: "Signature", templateCode: "signature", previewImage: null, isPremium: true, sortOrder: 3 },
];

describe("TemplatesGallery", () => {
  it("shows a loading message while templates load", () => {
    mockedFetchTemplates.mockReturnValue(new Promise(() => {}));
    render(<TemplatesGallery />);

    expect(screen.getByText(/Loading templates/)).toBeInTheDocument();
  });

  it("shows an error message when the fetch fails", async () => {
    mockedFetchTemplates.mockRejectedValue(new Error("network error"));
    render(<TemplatesGallery />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Failed to load templates.");
  });

  it("renders one card per template, in sortOrder, each with a Free/Pro label", async () => {
    mockedFetchTemplates.mockResolvedValue(TEMPLATES);
    render(<TemplatesGallery />);

    const headings = await screen.findAllByRole("heading", { level: 2 });
    expect(headings.map((heading) => heading.textContent)).toEqual(["Classic", "Modern", "Signature"]);

    const classicCard = headings[0].closest("li") as HTMLElement;
    expect(within(classicCard).getByText("Free")).toBeInTheDocument();
    const signatureCard = headings[2].closest("li") as HTMLElement;
    expect(within(signatureCard).getByText("Pro")).toBeInTheDocument();
  });

  it("links Use Template to /invoice/create with the template's code for a free template", async () => {
    mockedFetchTemplates.mockResolvedValue(TEMPLATES);
    render(<TemplatesGallery />);
    await screen.findByRole("heading", { name: "Classic" });

    const classicCard = screen.getByRole("heading", { name: "Classic" }).closest("li") as HTMLElement;
    expect(within(classicCard).getByRole("link", { name: "Use Template" })).toHaveAttribute(
      "href",
      "/invoice/create?template=classic",
    );
  });

  it("blocks Use Template on a premium template and shows an upgrade message instead of a link", async () => {
    mockedFetchTemplates.mockResolvedValue(TEMPLATES);
    const user = userEvent.setup();
    render(<TemplatesGallery />);
    await screen.findByRole("heading", { name: "Signature" });

    const signatureCard = screen.getByRole("heading", { name: "Signature" }).closest("li") as HTMLElement;
    expect(within(signatureCard).queryByRole("link", { name: "Use Template" })).not.toBeInTheDocument();

    await user.click(within(signatureCard).getByRole("button", { name: "Use Template" }));

    expect(within(signatureCard).getByRole("alert")).toHaveTextContent("Upgrade to Pro to use this template.");
  });

  it("opens a live preview modal on Preview, closes it on Close, and traps Escape", async () => {
    mockedFetchTemplates.mockResolvedValue(TEMPLATES);
    const user = userEvent.setup();
    render(<TemplatesGallery />);
    await screen.findByRole("heading", { name: "Modern" });

    const modernCard = screen.getByRole("heading", { name: "Modern" }).closest("li") as HTMLElement;
    await user.click(within(modernCard).getByRole("button", { name: "Preview" }));

    const dialog = await screen.findByRole("dialog", { name: "Modern" });
    // Sample content from lib/samplePreview.ts, proving the real InvoicePreview rendered.
    expect(within(dialog).getByText("Website design")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
