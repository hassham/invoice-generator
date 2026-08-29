import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentSession } from "../../../lib/auth";
import { loadPendingGateAction } from "../../../lib/pendingGateAction";
import { DRAFT_RETENTION_MS, loadDraftSnapshot, saveDraftSnapshot } from "../lib/draftStorage";
import { createEmptyDraft } from "../lib/invoiceDraft";
import { downloadInvoicePdf } from "../lib/invoicePdf";
import { createEmptyLineItem } from "../lib/lineItems";
import { processLogoUpload } from "../lib/logoUpload";
import { createEmptySupportingContent } from "../lib/supportingContent";
import { getDefaultCustomization } from "../lib/templateCustomization";
import type { Template } from "../lib/templates";
import type { InvoiceEditorSnapshot } from "../lib/unsavedChanges";
import { CreateInvoiceEditor } from "./CreateInvoiceEditor";

const STUB_TEMPLATES: Template[] = [
  { id: "template-classic", name: "Classic", templateCode: "classic", previewImage: null, isPremium: false, sortOrder: 1 },
  { id: "template-modern", name: "Modern", templateCode: "modern", previewImage: null, isPremium: false, sortOrder: 2 },
];

// Every test mounts the real editor, which fetches templates on mount (IG-39) - stubbed here so
// the whole suite stays deterministic and doesn't depend on a running backend.
vi.mock("../lib/templates", () => ({
  fetchTemplates: vi.fn(() => Promise.resolve(STUB_TEMPLATES)),
}));

// processLogoUpload does real image decoding via canvas/Image, which jsdom doesn't implement -
// stubbed here so logo tests stay deterministic without re-mocking the DOM at this level.
vi.mock("../lib/logoUpload", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/logoUpload")>()),
  processLogoUpload: vi.fn(),
}));

const mockedProcessLogoUpload = vi.mocked(processLogoUpload);

// downloadInvoicePdf does a real fetch + browser download - stubbed so PDF tests only verify the
// editor's own gating/wiring logic, not lib/invoicePdf.ts's mechanics (covered by its own tests).
vi.mock("../lib/invoicePdf", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/invoicePdf")>()),
  downloadInvoicePdf: vi.fn(),
}));

const mockedDownloadInvoicePdf = vi.mocked(downloadInvoicePdf);

// IG-30: Download PDF/Print are gated on the session check below - defaults to "anonymous" so
// every test not specifically about authentication exercises the common (anonymous) path without
// having to opt in explicitly. Tests that need the authenticated path override this per-test.
vi.mock("../../../lib/auth", () => ({
  getCurrentSession: vi.fn(() => Promise.resolve(null)),
}));

const mockedGetCurrentSession = vi.mocked(getCurrentSession);
const AUTHENTICATED_ACCOUNT = { userId: "u1", email: "jane@example.com", name: "Jane" };

describe("CreateInvoiceEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetCurrentSession.mockResolvedValue(null);
  });

  it("reflects the From and Bill To text in the live preview as it's typed", async () => {
    const user = userEvent.setup();
    render(<CreateInvoiceEditor />);

    await user.type(screen.getByLabelText("From", { exact: false }), "Acme Pty Ltd");
    await user.type(screen.getByLabelText("Bill To", { exact: false }), "Jane's Cafe");

    const preview = screen.getByRole("tabpanel", { name: "Preview" });
    expect(within(preview).getByText("Acme Pty Ltd")).toBeInTheDocument();
    expect(within(preview).getByText("Jane's Cafe")).toBeInTheDocument();
  });

  it("shows a field-level error for a missing required field without clearing other entered values", async () => {
    const user = userEvent.setup();
    render(<CreateInvoiceEditor />);

    await user.type(screen.getByLabelText("From", { exact: false }), "Acme Pty Ltd");
    // Invoice Number is required and left empty - blur it directly.
    await user.click(screen.getByLabelText(/Invoice Number/));
    await user.tab();

    expect(screen.getByText("Invoice Number is required.")).toBeInTheDocument();
    // The valid, already-entered From text must still be there.
    expect(screen.getByLabelText("From", { exact: false })).toHaveValue("Acme Pty Ltd");
  });

  it("clears a field's error as soon as it's corrected, without waiting for another blur", async () => {
    const user = userEvent.setup();
    render(<CreateInvoiceEditor />);

    const invoiceNumberInput = screen.getByLabelText(/Invoice Number/);
    await user.click(invoiceNumberInput);
    await user.tab();
    expect(screen.getByText("Invoice Number is required.")).toBeInTheDocument();

    await user.type(invoiceNumberInput, "INV-000001");

    expect(screen.queryByText("Invoice Number is required.")).not.toBeInTheDocument();
  });

  it("rejects a due date earlier than the issue date, once Advanced is switched on", async () => {
    const user = userEvent.setup();
    render(<CreateInvoiceEditor />);

    await user.click(screen.getByRole("button", { name: "Advanced" }));
    const dueDateInput = screen.getByLabelText(/Due Date/);
    await user.clear(dueDateInput);
    await user.type(dueDateInput, "2000-01-01");
    await user.tab();

    expect(screen.getByText("Due date cannot be earlier than the issue date.")).toBeInTheDocument();
  });

  it("defaults currency to AUD", () => {
    render(<CreateInvoiceEditor />);

    expect(screen.getByLabelText("Currency")).toHaveValue("AUD");
  });

  it("starts in Basic mode, hiding Due Date, Reference, Ship To, Notes and Payment Instructions", () => {
    render(<CreateInvoiceEditor />);

    expect(screen.getByLabelText(/Due Date/)).not.toBeVisible();
    expect(screen.getByLabelText(/^Reference/)).not.toBeVisible();
    expect(screen.getByLabelText("Ship To")).not.toBeVisible();
    expect(screen.getByLabelText("Notes")).not.toBeVisible();
    expect(screen.getByLabelText("Bank Name")).not.toBeVisible();
    // Basic-tier fields, including Terms, stay visible.
    expect(screen.getByLabelText("From", { exact: false })).toBeVisible();
    expect(screen.getByLabelText("Bill To", { exact: false })).toBeVisible();
    expect(screen.getByLabelText("Terms and Conditions")).toBeVisible();
  });

  it("switching to Advanced reveals Due Date, Reference, Ship To, Notes and Payment Instructions", async () => {
    const user = userEvent.setup();
    render(<CreateInvoiceEditor />);

    await user.click(screen.getByRole("button", { name: "Advanced" }));

    expect(screen.getByLabelText(/Due Date/)).toBeVisible();
    expect(screen.getByLabelText(/^Reference/)).toBeVisible();
    expect(screen.getByLabelText("Ship To")).toBeVisible();
    expect(screen.getByLabelText("Notes")).toBeVisible();
    expect(screen.getByLabelText("Bank Name")).toBeVisible();
  });

  it("keeps typed Advanced-only content after toggling back to Basic and forward again", async () => {
    const user = userEvent.setup();
    render(<CreateInvoiceEditor />);

    await user.click(screen.getByRole("button", { name: "Advanced" }));
    await user.type(screen.getByLabelText("Ship To"), "Warehouse 3");
    await user.click(screen.getByRole("button", { name: "Basic" }));
    await user.click(screen.getByRole("button", { name: "Advanced" }));

    expect(screen.getByLabelText("Ship To")).toHaveValue("Warehouse 3");
  });

  it("shows Advanced-only content in the preview even while the editor stays in Basic mode", async () => {
    const user = userEvent.setup();
    render(<CreateInvoiceEditor />);

    await user.click(screen.getByRole("button", { name: "Advanced" }));
    await user.type(screen.getByLabelText("Ship To"), "Warehouse 3");
    await user.click(screen.getByRole("button", { name: "Basic" }));

    const preview = screen.getByRole("tabpanel", { name: "Preview" });
    expect(within(preview).getByText("Warehouse 3")).toBeInTheDocument();
  });

  it("reflects a line item's description and computed line total in the live preview", async () => {
    const user = userEvent.setup();
    render(<CreateInvoiceEditor />);

    await user.type(screen.getByLabelText("Description", { exact: false }), "Consulting");
    await user.clear(screen.getByLabelText(/Quantity/));
    await user.type(screen.getByLabelText(/Quantity/), "2");
    await user.type(screen.getByLabelText(/Unit Price/), "50");

    const preview = screen.getByRole("tabpanel", { name: "Preview" });
    expect(within(preview).getByText("Consulting")).toBeInTheDocument();
    // 2 x 50 = 100, + 10% default GST = 110.00, shown as this item's own line total and (with
    // only one item, no invoice discount) also as the invoice Total/Amount Due.
    expect(within(preview).getAllByText(/AUD 110\.00/).length).toBeGreaterThan(0);
  });

  it("adding a second line item is reflected in the editor and the preview", async () => {
    const user = userEvent.setup();
    render(<CreateInvoiceEditor />);

    await user.click(screen.getByRole("button", { name: "Add Item" }));

    expect(screen.getAllByText(/^Item \d+$/)).toHaveLength(2);
  });

  it("applying an invoice discount updates the Totals in both the editor and the preview", async () => {
    const user = userEvent.setup();
    render(<CreateInvoiceEditor />);

    await user.type(screen.getByLabelText("Description", { exact: false }), "Consulting");
    await user.type(screen.getByLabelText(/Unit Price/), "100");
    // Default tax rate is 10%: subtotal 100, tax 10, total 110 before any invoice discount.

    await user.selectOptions(screen.getByLabelText("Invoice Discount"), "Percentage");
    await user.type(screen.getByLabelText(/Discount \(%\)/), "10");

    // Subtotal 100, 10% invoice discount = 10, adjusted 90, tax on 90 @ 10% = 9, total = 99.
    const preview = screen.getByRole("tabpanel", { name: "Preview" });
    expect(within(preview).getByText("-AUD 10.00")).toBeInTheDocument();
    expect(within(preview).getAllByText("AUD 99.00").length).toBeGreaterThan(0);
  });

  it("does not show Notes, Terms or Payment Instructions sections in the preview when empty - IG-122", () => {
    render(<CreateInvoiceEditor />);

    const preview = screen.getByRole("tabpanel", { name: "Preview" });
    expect(within(preview).queryByText("Notes")).not.toBeInTheDocument();
    expect(within(preview).queryByText("Terms and Conditions")).not.toBeInTheDocument();
    expect(within(preview).queryByText("Payment Instructions")).not.toBeInTheDocument();
  });

  it("reflects entered Notes, Terms and Payment Instructions in the preview once populated", async () => {
    // .paste() sets the whole value in one operation rather than simulating per-character
    // keystrokes (.type()) - these tests only care about the final rendered value, not per-key
    // behaviour, and per-character typing across three fields was measurably slow enough under
    // parallel test-suite load to occasionally bleed into the next test's render.
    const user = userEvent.setup();
    render(<CreateInvoiceEditor />);

    await user.click(screen.getByLabelText("Terms and Conditions"));
    await user.paste("Due in 14 days.");
    await user.click(screen.getByRole("button", { name: "Advanced" }));
    await user.click(screen.getByLabelText("Notes"));
    await user.paste("Thank you.");
    await user.click(screen.getByLabelText("Bank Name"));
    await user.paste("Big Bank");

    const preview = screen.getByRole("tabpanel", { name: "Preview" });
    expect(within(preview).getByText("Notes")).toBeInTheDocument();
    expect(within(preview).getByText("Thank you.")).toBeInTheDocument();
    expect(within(preview).getByText("Terms and Conditions")).toBeInTheDocument();
    expect(within(preview).getByText("Due in 14 days.")).toBeInTheDocument();
    expect(within(preview).getByText("Payment Instructions")).toBeInTheDocument();
    expect(within(preview).getByText("Bank Name: Big Bank")).toBeInTheDocument();
  });

  it("only shows the specific payment instruction fields that were actually filled in", async () => {
    const user = userEvent.setup();
    render(<CreateInvoiceEditor />);

    await user.click(screen.getByRole("button", { name: "Advanced" }));
    await user.click(screen.getByLabelText("Bank Name"));
    await user.paste("Big Bank");

    const preview = screen.getByRole("tabpanel", { name: "Preview" });
    expect(within(preview).getByText("Bank Name: Big Bank")).toBeInTheDocument();
    expect(within(preview).queryByText(/^IBAN:/)).not.toBeInTheDocument();
    expect(within(preview).queryByText(/^SWIFT:/)).not.toBeInTheDocument();
  });

  it("Review invoice shows a red summary banner naming the invalid sections on a blank form", async () => {
    const user = userEvent.setup();
    render(<CreateInvoiceEditor />);

    await user.click(screen.getByRole("button", { name: "Review invoice" }));

    // Not screen.getByRole("alert") - individual field errors (e.g. "Invoice Number is required.")
    // also use role="alert", so that would match several elements. The summary banner is the only
    // text starting this way.
    const banner = screen.getByText(/This invoice isn't ready yet/);
    expect(banner).toHaveTextContent("Invoice details");
    expect(banner).toHaveTextContent("From");
    expect(banner).toHaveTextContent("Bill To");
    expect(banner).toHaveTextContent("Items");
  });

  it("Review invoice shows a green 'looks ready' message once every section is valid", async () => {
    const user = userEvent.setup();
    render(<CreateInvoiceEditor />);

    await user.type(screen.getByLabelText(/Invoice Number/), "INV-000001");
    await user.type(screen.getByLabelText("From", { exact: false }), "Acme Pty Ltd");
    await user.type(screen.getByLabelText("Bill To", { exact: false }), "Jane's Cafe");
    await user.type(screen.getByLabelText("Description", { exact: false }), "Consulting");
    await user.type(screen.getByLabelText(/Unit Price/), "50");

    await user.click(screen.getByRole("button", { name: "Review invoice" }));

    expect(screen.getByRole("status")).toHaveTextContent("This invoice looks ready.");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("Review invoice's summary drops a section as soon as its error is fixed", async () => {
    const user = userEvent.setup();
    render(<CreateInvoiceEditor />);

    await user.click(screen.getByRole("button", { name: "Review invoice" }));
    expect(screen.getByText(/This invoice isn't ready yet/)).toHaveTextContent("From");

    await user.type(screen.getByLabelText("From", { exact: false }), "Acme Pty Ltd");

    expect(screen.getByText(/This invoice isn't ready yet/)).not.toHaveTextContent("From");
  });

  it("Review invoice auto-switches to Advanced when the only error is in an Advanced-only field", async () => {
    const user = userEvent.setup();
    render(<CreateInvoiceEditor />);

    // Make Due Date invalid while Advanced is open, then hide it again by switching back to Basic.
    await user.click(screen.getByRole("button", { name: "Advanced" }));
    const dueDateInput = screen.getByLabelText(/Due Date/);
    await user.clear(dueDateInput);
    await user.type(dueDateInput, "2000-01-01");
    await user.click(screen.getByRole("button", { name: "Basic" }));
    expect(screen.getByLabelText(/Due Date/)).not.toBeVisible();

    await user.click(screen.getByRole("button", { name: "Review invoice" }));

    expect(screen.getByRole("button", { name: "Advanced" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText(/Due Date/)).toBeVisible();
  });

  it("does not warn via beforeunload on an untouched form", () => {
    render(<CreateInvoiceEditor />);

    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
  });

  it("warns via beforeunload once something has been typed", async () => {
    const user = userEvent.setup();
    render(<CreateInvoiceEditor />);

    await user.type(screen.getByLabelText("From", { exact: false }), "Acme Pty Ltd");

    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it("auto-selects the first template once the template fetch resolves", async () => {
    render(<CreateInvoiceEditor />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Classic/ })).toHaveAttribute("aria-pressed", "true");
    });
  });

  it("selecting a different template preserves already-typed invoice content", async () => {
    const user = userEvent.setup();
    render(<CreateInvoiceEditor />);
    await waitFor(() => expect(screen.getByRole("button", { name: /Classic/ })).toBeInTheDocument());

    await user.type(screen.getByLabelText("From", { exact: false }), "Acme Pty Ltd");
    await user.type(screen.getByLabelText("Description", { exact: false }), "Consulting");

    await user.click(screen.getByRole("button", { name: /Modern/ }));

    expect(screen.getByRole("button", { name: /Modern/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("From", { exact: false })).toHaveValue("Acme Pty Ltd");
    expect(screen.getByLabelText("Description", { exact: false })).toHaveValue("Consulting");
  });

  it("does not warn via beforeunload just because the template auto-selected itself", async () => {
    render(<CreateInvoiceEditor />);
    await waitFor(() => expect(screen.getByRole("button", { name: /Classic/ })).toHaveAttribute("aria-pressed", "true"));

    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
  });

  it("customisation defaults to the auto-selected template's colors", async () => {
    render(<CreateInvoiceEditor />);

    await waitFor(() => {
      expect(screen.getByLabelText("Primary Color")).toHaveValue(getDefaultCustomization("classic").primaryColor);
    });
  });

  it("switching templates resets customisation to the new template's defaults", async () => {
    const user = userEvent.setup();
    render(<CreateInvoiceEditor />);
    await waitFor(() => expect(screen.getByRole("button", { name: /Classic/ })).toHaveAttribute("aria-pressed", "true"));

    // Manually customise while on Classic, then switch templates.
    fireEvent.change(screen.getByLabelText("Primary Color"), { target: { value: "#ff0000" } });
    expect(screen.getByLabelText("Primary Color")).toHaveValue("#ff0000");

    await user.click(screen.getByRole("button", { name: /Modern/ }));

    expect(screen.getByLabelText("Primary Color")).toHaveValue(getDefaultCustomization("modern").primaryColor);
  });

  it("changing the accent color updates the live preview immediately - IG-41", async () => {
    render(<CreateInvoiceEditor />);
    await waitFor(() => expect(screen.getByRole("button", { name: /Classic/ })).toHaveAttribute("aria-pressed", "true"));

    fireEvent.change(screen.getByLabelText("Accent Color"), { target: { value: "#ff0000" } });

    const preview = screen.getByRole("tabpanel", { name: "Preview" });
    expect(within(preview).getByText("Invoice")).toHaveStyle({ color: "#ff0000" });
  });

  it("warns via beforeunload once appearance has been customised", async () => {
    render(<CreateInvoiceEditor />);
    await waitFor(() => expect(screen.getByRole("button", { name: /Classic/ })).toHaveAttribute("aria-pressed", "true"));

    fireEvent.change(screen.getByLabelText("Primary Color"), { target: { value: "#ff0000" } });

    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it("uploading a logo shows it in the live preview", async () => {
    const user = userEvent.setup();
    mockedProcessLogoUpload.mockResolvedValue({ dataUrl: "data:image/png;base64,abc" });
    render(<CreateInvoiceEditor />);

    await user.upload(
      screen.getByLabelText("Upload logo"),
      new File([new Uint8Array([1, 2, 3])], "logo.png", { type: "image/png" }),
    );

    const preview = screen.getByRole("tabpanel", { name: "Preview" });
    await waitFor(() => expect(within(preview).getByAltText("Business logo")).toHaveAttribute("src", "data:image/png;base64,abc"));
  });

  it("removing a logo clears it from the live preview", async () => {
    const user = userEvent.setup();
    mockedProcessLogoUpload.mockResolvedValue({ dataUrl: "data:image/png;base64,abc" });
    render(<CreateInvoiceEditor />);
    await user.upload(
      screen.getByLabelText("Upload logo"),
      new File([new Uint8Array([1, 2, 3])], "logo.png", { type: "image/png" }),
    );
    await waitFor(() => expect(screen.getByRole("button", { name: "Remove logo" })).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Remove logo" }));

    const preview = screen.getByRole("tabpanel", { name: "Preview" });
    expect(within(preview).queryByAltText("Business logo")).not.toBeInTheDocument();
  });

  it("warns via beforeunload once a logo has been uploaded", async () => {
    const user = userEvent.setup();
    mockedProcessLogoUpload.mockResolvedValue({ dataUrl: "data:image/png;base64,abc" });
    render(<CreateInvoiceEditor />);

    await user.upload(
      screen.getByLabelText("Upload logo"),
      new File([new Uint8Array([1, 2, 3])], "logo.png", { type: "image/png" }),
    );
    await waitFor(() => expect(screen.getByRole("button", { name: "Remove logo" })).toBeInTheDocument());

    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it("clicking Download PDF on an invalid invoice shows the review banner and does not download", async () => {
    const user = userEvent.setup();
    render(<CreateInvoiceEditor />);

    await user.click(screen.getByRole("button", { name: "Download PDF" }));

    expect(screen.getByText(/This invoice isn't ready yet/)).toBeInTheDocument();
    expect(mockedDownloadInvoicePdf).not.toHaveBeenCalled();
  });

  it("as an authenticated user, clicking Download PDF on a valid invoice downloads the PDF", async () => {
    const user = userEvent.setup();
    mockedGetCurrentSession.mockResolvedValue(AUTHENTICATED_ACCOUNT);
    mockedDownloadInvoicePdf.mockResolvedValue(undefined);
    render(<CreateInvoiceEditor />);
    await waitFor(() => expect(mockedGetCurrentSession).toHaveResolvedTimes(1));

    await user.type(screen.getByLabelText(/Invoice Number/), "INV-000001");
    await user.type(screen.getByLabelText("From", { exact: false }), "Acme Pty Ltd");
    await user.type(screen.getByLabelText("Bill To", { exact: false }), "Jane's Cafe");
    await user.type(screen.getByLabelText("Description", { exact: false }), "Consulting");
    await user.type(screen.getByLabelText(/Unit Price/), "50");

    await user.click(screen.getByRole("button", { name: "Download PDF" }));

    await waitFor(() => expect(mockedDownloadInvoicePdf).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(/This invoice isn't ready yet/)).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("as an authenticated user, shows an inline error message when the PDF download fails", async () => {
    const user = userEvent.setup();
    mockedGetCurrentSession.mockResolvedValue(AUTHENTICATED_ACCOUNT);
    mockedDownloadInvoicePdf.mockRejectedValue(new Error("Failed to generate the PDF."));
    render(<CreateInvoiceEditor />);
    await waitFor(() => expect(mockedGetCurrentSession).toHaveResolvedTimes(1));

    await user.type(screen.getByLabelText(/Invoice Number/), "INV-000001");
    await user.type(screen.getByLabelText("From", { exact: false }), "Acme Pty Ltd");
    await user.type(screen.getByLabelText("Bill To", { exact: false }), "Jane's Cafe");
    await user.type(screen.getByLabelText("Description", { exact: false }), "Consulting");
    await user.type(screen.getByLabelText(/Unit Price/), "50");

    await user.click(screen.getByRole("button", { name: "Download PDF" }));

    expect(await screen.findByText("Failed to generate the PDF.")).toBeInTheDocument();
  });

  it("as an authenticated user, clicking Print calls window.print()", async () => {
    const user = userEvent.setup();
    mockedGetCurrentSession.mockResolvedValue(AUTHENTICATED_ACCOUNT);
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});
    render(<CreateInvoiceEditor />);
    await waitFor(() => expect(mockedGetCurrentSession).toHaveResolvedTimes(1));

    await user.click(screen.getByRole("button", { name: "Print" }));

    expect(printSpy).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    printSpy.mockRestore();
  });

  it("as an anonymous user, filling in a full invoice and clicking Download PDF persists only to local storage (IG-29's draft auto-save), shows the account gate, and calls no download endpoint - IG-28/IG-30", async () => {
    const user = userEvent.setup();
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem");
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<CreateInvoiceEditor />);
    await waitFor(() => expect(screen.getByRole("button", { name: /Classic/ })).toBeInTheDocument());

    await user.type(screen.getByLabelText(/Invoice Number/), "INV-000001");
    await user.type(screen.getByLabelText("From", { exact: false }), "Acme Pty Ltd");
    await user.type(screen.getByLabelText("Bill To", { exact: false }), "Jane's Cafe");
    await user.type(screen.getByLabelText("Description", { exact: false }), "Consulting");
    await user.type(screen.getByLabelText(/Unit Price/), "50");
    await user.click(screen.getByRole("button", { name: "Advanced" }));
    await user.type(screen.getByLabelText("Ship To"), "Warehouse 3");
    await user.click(screen.getByRole("button", { name: "Download PDF" }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(mockedDownloadInvoicePdf).not.toHaveBeenCalled();
    // No account-owned persistence anywhere: the only network calls this app can make are mocked
    // away entirely (templates, session check, PDF download) - no unmocked request (e.g. a POST to
    // create an invoice record) fires as a side effect of filling in the form. The IG-29 draft
    // auto-save does write to localStorage (that's the point of this Story), but only ever to this
    // browser, never to the server.
    expect(setItemSpy).toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    setItemSpy.mockRestore();
    fetchSpy.mockRestore();
  });

  describe("IG-30: account gate for Download PDF and Print", () => {
    it("shows the account gate instead of printing when an anonymous user clicks Print", async () => {
      const user = userEvent.setup();
      const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});
      render(<CreateInvoiceEditor />);

      await user.click(screen.getByRole("button", { name: "Print" }));

      expect(await screen.findByRole("dialog")).toBeInTheDocument();
      expect(printSpy).not.toHaveBeenCalled();
      printSpy.mockRestore();
    });

    it("shows FSD's exact account-gate message with working Sign up and Log in links", async () => {
      const user = userEvent.setup();
      render(<CreateInvoiceEditor />);

      await user.click(screen.getByRole("button", { name: "Print" }));

      const dialog = await screen.findByRole("dialog");
      expect(within(dialog).getByText("Create a free account to download and securely save your invoice.")).toBeInTheDocument();
      expect(within(dialog).getByRole("link", { name: "Sign up" })).toHaveAttribute("href", "/signup");
      expect(within(dialog).getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login");
    });

    it("dismisses the gate via the Not now button", async () => {
      const user = userEvent.setup();
      render(<CreateInvoiceEditor />);

      await user.click(screen.getByRole("button", { name: "Print" }));
      await screen.findByRole("dialog");
      await user.click(screen.getByRole("button", { name: "Not now" }));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("dismisses the gate via Escape", async () => {
      const user = userEvent.setup();
      render(<CreateInvoiceEditor />);

      await user.click(screen.getByRole("button", { name: "Print" }));
      await screen.findByRole("dialog");
      await user.keyboard("{Escape}");

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  describe("IG-31: preserve the pending action through authentication", () => {
    it("persists the requested action when the gate is shown, so it survives navigating to /login or /signup", async () => {
      const user = userEvent.setup();
      render(<CreateInvoiceEditor />);

      await user.click(screen.getByRole("button", { name: "Print" }));

      await screen.findByRole("dialog");
      expect(loadPendingGateAction()).toBe("print");
    });

    it("records download separately from print", async () => {
      const user = userEvent.setup();
      render(<CreateInvoiceEditor />);

      await user.type(screen.getByLabelText(/Invoice Number/), "INV-000001");
      await user.type(screen.getByLabelText("From", { exact: false }), "Acme Pty Ltd");
      await user.type(screen.getByLabelText("Bill To", { exact: false }), "Jane's Cafe");
      await user.type(screen.getByLabelText("Description", { exact: false }), "Consulting");
      await user.type(screen.getByLabelText(/Unit Price/), "50");
      await user.click(screen.getByRole("button", { name: "Download PDF" }));

      await screen.findByRole("dialog");
      expect(loadPendingGateAction()).toBe("download");
    });

    it("clears the persisted action when the gate is dismissed via Not now - a cancelled request must not resurface later", async () => {
      const user = userEvent.setup();
      render(<CreateInvoiceEditor />);

      await user.click(screen.getByRole("button", { name: "Print" }));
      await screen.findByRole("dialog");
      await user.click(screen.getByRole("button", { name: "Not now" }));

      expect(loadPendingGateAction()).toBeNull();
    });

    it("clears the persisted action when the gate is dismissed via Escape", async () => {
      const user = userEvent.setup();
      render(<CreateInvoiceEditor />);

      await user.click(screen.getByRole("button", { name: "Print" }));
      await screen.findByRole("dialog");
      await user.keyboard("{Escape}");

      expect(loadPendingGateAction()).toBeNull();
    });
  });

  describe("IG-29: recover an anonymous invoice draft locally", () => {
    function seededSnapshot(overrides: Partial<InvoiceEditorSnapshot> = {}): InvoiceEditorSnapshot {
      return {
        draft: { ...createEmptyDraft(), seller: "Acme Pty Ltd" },
        lineItems: [createEmptyLineItem()],
        invoiceDiscountType: "None",
        invoiceDiscountValue: "",
        supportingContent: createEmptySupportingContent(),
        ...overrides,
      };
    }

    it("restores a previously auto-saved draft on mount and shows a restoration notice", async () => {
      saveDraftSnapshot(seededSnapshot());

      render(<CreateInvoiceEditor />);

      expect(await screen.findByLabelText("From", { exact: false })).toHaveValue("Acme Pty Ltd");
      expect(screen.getByText(/We restored your unsaved invoice draft/)).toBeInTheDocument();
    });

    it("does not show a restoration notice or restore anything on a first-ever visit", () => {
      render(<CreateInvoiceEditor />);

      expect(screen.queryByText(/We restored your unsaved invoice draft/)).not.toBeInTheDocument();
      expect(screen.getByLabelText("From", { exact: false })).toHaveValue("");
    });

    it("does not restore a draft saved past the retention window, per the retention policy", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
      saveDraftSnapshot(seededSnapshot());
      vi.setSystemTime(new Date("2026-01-01T00:00:00Z").getTime() + DRAFT_RETENTION_MS + 1);

      render(<CreateInvoiceEditor />);

      expect(screen.queryByText(/We restored your unsaved invoice draft/)).not.toBeInTheDocument();
      expect(screen.getByLabelText("From", { exact: false })).toHaveValue("");
      vi.useRealTimers();
    });

    it("typing into the form auto-saves a draft that a later mount (e.g. after a refresh) restores", async () => {
      const user = userEvent.setup();
      const { unmount } = render(<CreateInvoiceEditor />);
      await waitFor(() => expect(screen.getByRole("button", { name: /Classic/ })).toBeInTheDocument());

      await user.type(screen.getByLabelText("From", { exact: false }), "Acme Pty Ltd");
      await waitFor(() => expect(loadDraftSnapshot()?.draft.seller).toBe("Acme Pty Ltd"));
      unmount();

      render(<CreateInvoiceEditor />);

      expect(await screen.findByLabelText("From", { exact: false })).toHaveValue("Acme Pty Ltd");
    });

    it("Discard draft and start over clears the saved draft and resets the form to blank", async () => {
      const user = userEvent.setup();
      saveDraftSnapshot(seededSnapshot());
      render(<CreateInvoiceEditor />);
      expect(await screen.findByLabelText("From", { exact: false })).toHaveValue("Acme Pty Ltd");

      await user.click(screen.getByRole("button", { name: "Discard draft and start over" }));

      expect(screen.queryByText(/We restored your unsaved invoice draft/)).not.toBeInTheDocument();
      expect(screen.getByLabelText("From", { exact: false })).toHaveValue("");
      expect(loadDraftSnapshot()).toBeNull();
    });
  });
});
