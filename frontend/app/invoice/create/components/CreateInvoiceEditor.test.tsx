import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentSession } from "../../../lib/auth";
import { getBusinessProfile, type BusinessProfile } from "../../../lib/business";
import { listCustomers } from "../../../lib/customers";
import { loadPendingGateAction, savePendingGateAction } from "../../../lib/pendingGateAction";
import { resetAnalyticsSink, setAnalyticsSink, type AnalyticsSink } from "../../../../lib/analytics";
import { DRAFT_RETENTION_MS, loadDraftSnapshot, saveDraftSnapshot } from "../lib/draftStorage";
import { createEmptyDraft } from "../lib/invoiceDraft";
import { downloadInvoicePdf } from "../lib/invoicePdf";
import { AUTO_SAVE_DEBOUNCE_MS, createInvoice, updateInvoice } from "../lib/invoiceSave";
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

// createInvoice/updateInvoice do a real fetch - stubbed so save tests only verify the editor's own
// gating/wiring/debounce logic, not lib/invoiceSave.ts's mechanics (covered by its own tests).
vi.mock("../lib/invoiceSave", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/invoiceSave")>()),
  createInvoice: vi.fn(),
  updateInvoice: vi.fn(),
}));

const mockedCreateInvoice = vi.mocked(createInvoice);
const mockedUpdateInvoice = vi.mocked(updateInvoice);
const SAVED_INVOICE = {
  id: "invoice-1",
  customerId: "customer-1",
  invoiceNumber: "INV-000001",
  status: "Draft",
  issueDate: "2026-08-01",
  dueDate: "2026-08-01",
  currency: "AUD",
  reference: null,
  subtotal: 55,
  discountAmount: 0,
  taxAmount: 5,
  totalAmount: 55,
  amountPaid: 0,
  amountDue: 55,
  createdAt: "2026-08-01T00:00:00Z",
  updatedAt: "2026-08-01T00:00:00Z",
};

// IG-30: Download PDF/Print are gated on the session check below - defaults to "anonymous" so
// every test not specifically about authentication exercises the common (anonymous) path without
// having to opt in explicitly. Tests that need the authenticated path override this per-test.
vi.mock("../../../lib/auth", () => ({
  getCurrentSession: vi.fn(() => Promise.resolve(null)),
}));

const mockedGetCurrentSession = vi.mocked(getCurrentSession);
const AUTHENTICATED_ACCOUNT = { userId: "u1", email: "jane@example.com", name: "Jane" };

// IG-56: fetches saved customers once authenticated (for the CustomerPicker search box) - stubbed
// so every authenticated test doesn't also issue a real, unmocked fetch (same gotcha documented
// for lib/auth.ts: an unstubbed account-owned fetch fails silently in jsdom rather than failing
// the test, so it has to be caught here rather than relying on a red test to notice it).
vi.mock("../../../lib/customers", () => ({
  listCustomers: vi.fn(() => Promise.resolve([])),
}));

const mockedListCustomers = vi.mocked(listCustomers);

// IG-51: fetches the account's business profile once authenticated, to pre-fill a fresh invoice -
// stubbed to reject by default (matching the pre-IG-51 behavior of every other test in this file
// that doesn't care about it), same "unstubbed account-owned fetch fails silently in jsdom" gotcha
// as lib/auth.ts/lib/customers.ts above. Tests that specifically exercise the pre-fill override
// this per-test.
vi.mock("../../../lib/business", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../lib/business")>()),
  getBusinessProfile: vi.fn(() => Promise.reject(new Error("not mocked"))),
}));

const mockedGetBusinessProfile = vi.mocked(getBusinessProfile);

const SAMPLE_BUSINESS_PROFILE: BusinessProfile = {
  id: "business-1",
  businessName: "Acme Pty Ltd",
  legalName: null,
  email: "billing@acme.example",
  phone: null,
  website: null,
  addressLine1: "1 Example St",
  addressLine2: null,
  city: "Sydney",
  state: "NSW",
  postalCode: "2000",
  country: "AU",
  registrationNumber: null,
  taxNumber: null,
  defaultCurrency: "USD",
  defaultTaxRate: 0,
  taxCalculationMethod: "Exclusive",
  defaultPaymentTerms: "Net14",
  defaultPaymentTermsDays: null,
  defaultInvoiceNotes: "Thanks for your business",
  defaultTermsAndConditions: "Payment due within terms",
  defaultTemplateId: null,
  createdAt: "2026-08-01T00:00:00Z",
  updatedAt: "2026-08-01T00:00:00Z",
};

describe("CreateInvoiceEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetCurrentSession.mockResolvedValue(null);
    mockedCreateInvoice.mockReset();
    mockedUpdateInvoice.mockReset();
    mockedGetBusinessProfile.mockRejectedValue(new Error("not mocked"));
  });

  afterEach(() => {
    resetAnalyticsSink();
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

  describe("IG-32: complete the pending action automatically once authenticated", () => {
    it("tracks anonymous_gate_shown with the requested action when the gate appears", async () => {
      const sink: AnalyticsSink = { track: vi.fn() };
      setAnalyticsSink(sink);
      const user = userEvent.setup();
      render(<CreateInvoiceEditor />);

      await user.click(screen.getByRole("button", { name: "Print" }));
      await screen.findByRole("dialog");

      expect(sink.track).toHaveBeenCalledWith({ name: "anonymous_gate_shown", properties: { action: "print" } });
    });

    it("tracks anonymous_gate_dismissed when the gate is dismissed", async () => {
      const sink: AnalyticsSink = { track: vi.fn() };
      setAnalyticsSink(sink);
      const user = userEvent.setup();
      render(<CreateInvoiceEditor />);

      await user.click(screen.getByRole("button", { name: "Print" }));
      await screen.findByRole("dialog");
      await user.click(screen.getByRole("button", { name: "Not now" }));

      expect(sink.track).toHaveBeenCalledWith({ name: "anonymous_gate_dismissed", properties: { action: "print" } });
    });

    it("auto-fires Print without another click when returning authenticated with a pending print action, after saving under the account (IG-32)", async () => {
      saveDraftSnapshot({
        draft: {
          ...createEmptyDraft(),
          seller: "Acme Pty Ltd",
          customer: "Jane's Cafe",
          header: { ...createEmptyDraft().header, invoiceNumber: "INV-000001", issueDate: "2026-08-01", dueDate: "2026-08-15" },
        },
        lineItems: [{ ...createEmptyLineItem(), description: "Consulting", unitPrice: "50" }],
        invoiceDiscountType: "None",
        invoiceDiscountValue: "",
        supportingContent: createEmptySupportingContent(),
      });
      savePendingGateAction("print");
      mockedGetCurrentSession.mockResolvedValue(AUTHENTICATED_ACCOUNT);
      mockedCreateInvoice.mockResolvedValue(SAVED_INVOICE);
      const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});
      const sink: AnalyticsSink = { track: vi.fn() };
      setAnalyticsSink(sink);

      render(<CreateInvoiceEditor />);

      await waitFor(() => expect(mockedCreateInvoice).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(printSpy).toHaveBeenCalledTimes(1));
      expect(loadPendingGateAction()).toBeNull();
      expect(sink.track).toHaveBeenCalledWith({ name: "pending_action_completed", properties: { action: "print" } });
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      printSpy.mockRestore();
    });

    it("leaves the pending action in place (no print, not cleared) when the automatic save fails, then completes it on a manual Retry - safe retry, no duplicate invoices (IG-32)", async () => {
      saveDraftSnapshot({
        draft: {
          ...createEmptyDraft(),
          seller: "Acme Pty Ltd",
          customer: "Jane's Cafe",
          header: { ...createEmptyDraft().header, invoiceNumber: "INV-000001", issueDate: "2026-08-01", dueDate: "2026-08-15" },
        },
        lineItems: [{ ...createEmptyLineItem(), description: "Consulting", unitPrice: "50" }],
        invoiceDiscountType: "None",
        invoiceDiscountValue: "",
        supportingContent: createEmptySupportingContent(),
      });
      savePendingGateAction("print");
      mockedGetCurrentSession.mockResolvedValue(AUTHENTICATED_ACCOUNT);
      mockedCreateInvoice.mockRejectedValueOnce(new Error("Failed to save this invoice."));
      mockedCreateInvoice.mockResolvedValueOnce(SAVED_INVOICE);
      const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});
      const user = userEvent.setup();

      render(<CreateInvoiceEditor />);

      expect(await screen.findByRole("alert")).toHaveTextContent("Failed to save this invoice.");
      expect(printSpy).not.toHaveBeenCalled();
      expect(loadPendingGateAction()).toBe("print");

      await user.click(screen.getByRole("button", { name: "Retry" }));

      await waitFor(() => expect(printSpy).toHaveBeenCalledTimes(1));
      expect(mockedCreateInvoice).toHaveBeenCalledTimes(2);
      expect(loadPendingGateAction()).toBeNull();
      printSpy.mockRestore();
    });

    it("auto-downloads without another click when returning authenticated with a pending download action and a still-valid invoice", async () => {
      const user = userEvent.setup();
      mockedDownloadInvoicePdf.mockResolvedValue(undefined);
      const { unmount } = render(<CreateInvoiceEditor />);
      await waitFor(() => expect(screen.getByRole("button", { name: /Classic/ })).toBeInTheDocument());

      // Anonymous: fill a valid invoice and request Download PDF - IG-29's auto-save persists this
      // exact draft to localStorage, and IG-31 persists the pending action, just as a real gate
      // encounter would before the visitor navigates off to /signup.
      await user.type(screen.getByLabelText(/Invoice Number/), "INV-000001");
      await user.type(screen.getByLabelText("From", { exact: false }), "Acme Pty Ltd");
      await user.type(screen.getByLabelText("Bill To", { exact: false }), "Jane's Cafe");
      await user.type(screen.getByLabelText("Description", { exact: false }), "Consulting");
      await user.type(screen.getByLabelText(/Unit Price/), "50");
      await user.click(screen.getByRole("button", { name: "Download PDF" }));
      await screen.findByRole("dialog");
      unmount();

      // Simulates the real flow: a full page navigation back to /invoice/create after
      // registering/logging in - a fresh mount, now authenticated, with the prior draft and
      // pending action both already sitting in localStorage.
      mockedGetCurrentSession.mockResolvedValue(AUTHENTICATED_ACCOUNT);
      mockedCreateInvoice.mockResolvedValue(SAVED_INVOICE);
      const sink: AnalyticsSink = { track: vi.fn() };
      setAnalyticsSink(sink);
      render(<CreateInvoiceEditor />);

      // IG-32: the invoice is saved under the account before the download fires.
      await waitFor(() => expect(mockedCreateInvoice).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(mockedDownloadInvoicePdf).toHaveBeenCalledTimes(1));
      expect(loadPendingGateAction()).toBeNull();
      expect(sink.track).toHaveBeenCalledWith({ name: "pending_action_completed", properties: { action: "download" } });
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("does not auto-fire anything for an authenticated visitor with no pending action", async () => {
      mockedGetCurrentSession.mockResolvedValue(AUTHENTICATED_ACCOUNT);
      const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});

      render(<CreateInvoiceEditor />);
      await waitFor(() => expect(mockedGetCurrentSession).toHaveResolvedTimes(1));

      expect(printSpy).not.toHaveBeenCalled();
      expect(mockedDownloadInvoicePdf).not.toHaveBeenCalled();
      printSpy.mockRestore();
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

  describe("IG-45: save and auto-save invoice drafts", () => {
    async function fillValidInvoice(user: ReturnType<typeof userEvent.setup>) {
      await user.type(screen.getByLabelText(/Invoice Number/), "INV-000001");
      await user.type(screen.getByLabelText("From", { exact: false }), "Acme Pty Ltd");
      await user.type(screen.getByLabelText("Bill To", { exact: false }), "Jane's Cafe");
      await user.type(screen.getByLabelText("Description", { exact: false }), "Consulting");
      await user.type(screen.getByLabelText(/Unit Price/), "50");
    }

    it("shows no Save button or status area for an anonymous visitor", async () => {
      render(<CreateInvoiceEditor />);
      await waitFor(() => expect(mockedGetCurrentSession).toHaveResolvedTimes(1));

      expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
    });

    it("clicking Save on an invalid invoice shows the review banner and does not save", async () => {
      mockedGetCurrentSession.mockResolvedValue(AUTHENTICATED_ACCOUNT);
      const user = userEvent.setup();
      render(<CreateInvoiceEditor />);
      await waitFor(() => expect(mockedGetCurrentSession).toHaveResolvedTimes(1));

      await user.click(screen.getByRole("button", { name: "Save" }));

      expect(screen.getByText(/This invoice isn't ready yet/)).toBeInTheDocument();
      expect(mockedCreateInvoice).not.toHaveBeenCalled();
    });

    it("saves a valid invoice and shows a Saved status", async () => {
      mockedGetCurrentSession.mockResolvedValue(AUTHENTICATED_ACCOUNT);
      mockedCreateInvoice.mockResolvedValue(SAVED_INVOICE);
      const user = userEvent.setup();
      render(<CreateInvoiceEditor />);
      await waitFor(() => expect(mockedGetCurrentSession).toHaveResolvedTimes(1));
      await fillValidInvoice(user);

      await user.click(screen.getByRole("button", { name: "Save" }));

      await waitFor(() => expect(mockedCreateInvoice).toHaveBeenCalledTimes(1));
      expect(await screen.findByRole("status")).toHaveTextContent("Saved.");
      expect(mockedUpdateInvoice).not.toHaveBeenCalled();
    });

    it("shows a link to the saved invoice's detail page once saved (IG-47)", async () => {
      mockedGetCurrentSession.mockResolvedValue(AUTHENTICATED_ACCOUNT);
      mockedCreateInvoice.mockResolvedValue(SAVED_INVOICE);
      const user = userEvent.setup();
      render(<CreateInvoiceEditor />);
      await waitFor(() => expect(mockedGetCurrentSession).toHaveResolvedTimes(1));
      await fillValidInvoice(user);

      expect(screen.queryByRole("link", { name: "View saved invoice" })).not.toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Save" }));

      expect(await screen.findByRole("link", { name: "View saved invoice" })).toHaveAttribute(
        "href",
        "/documents/invoices/invoice-1",
      );
    });

    it("a second save updates the previously saved invoice instead of creating a new one", async () => {
      mockedGetCurrentSession.mockResolvedValue(AUTHENTICATED_ACCOUNT);
      mockedCreateInvoice.mockResolvedValue(SAVED_INVOICE);
      mockedUpdateInvoice.mockResolvedValue(SAVED_INVOICE);
      const user = userEvent.setup();
      render(<CreateInvoiceEditor />);
      await waitFor(() => expect(mockedGetCurrentSession).toHaveResolvedTimes(1));
      await fillValidInvoice(user);
      await user.click(screen.getByRole("button", { name: "Save" }));
      await waitFor(() => expect(mockedCreateInvoice).toHaveBeenCalledTimes(1));

      await user.type(screen.getByLabelText("Description", { exact: false }), " and support");
      await user.click(screen.getByRole("button", { name: "Save" }));

      await waitFor(() => expect(mockedUpdateInvoice).toHaveBeenCalledTimes(1));
      expect(mockedUpdateInvoice).toHaveBeenCalledWith("invoice-1", expect.anything());
      expect(mockedCreateInvoice).toHaveBeenCalledTimes(1);
    });

    it("shows a retryable error banner when saving fails, and Retry saves successfully once the failure clears", async () => {
      mockedGetCurrentSession.mockResolvedValue(AUTHENTICATED_ACCOUNT);
      mockedCreateInvoice.mockRejectedValueOnce(new Error("Failed to save this invoice."));
      mockedCreateInvoice.mockResolvedValueOnce(SAVED_INVOICE);
      const user = userEvent.setup();
      render(<CreateInvoiceEditor />);
      await waitFor(() => expect(mockedGetCurrentSession).toHaveResolvedTimes(1));
      await fillValidInvoice(user);

      await user.click(screen.getByRole("button", { name: "Save" }));

      expect(await screen.findByRole("alert")).toHaveTextContent("Failed to save this invoice.");

      await user.click(screen.getByRole("button", { name: "Retry" }));

      expect(await screen.findByRole("status")).toHaveTextContent("Saved.");
      expect(mockedCreateInvoice).toHaveBeenCalledTimes(2);
    });

    it("auto-saves once editing pauses for the configured interval, resetting that interval on every further edit", async () => {
      mockedGetCurrentSession.mockResolvedValue(AUTHENTICATED_ACCOUNT);
      mockedCreateInvoice.mockResolvedValue(SAVED_INVOICE);
      const user = userEvent.setup();
      render(<CreateInvoiceEditor />);
      await waitFor(() => expect(mockedGetCurrentSession).toHaveResolvedTimes(1));
      await waitFor(() => expect(screen.getByRole("button", { name: /Classic/ })).toBeInTheDocument());
      await fillValidInvoice(user);

      vi.useFakeTimers();
      try {
        await vi.advanceTimersByTimeAsync(AUTO_SAVE_DEBOUNCE_MS - 500);
        expect(mockedCreateInvoice).not.toHaveBeenCalled();

        // A further edit here must reset the pending timer, not just leave it running -
        // fireEvent instead of userEvent, since userEvent's own internal delays don't advance
        // under a faked clock.
        fireEvent.change(screen.getByLabelText(/Unit Price/), { target: { value: "60" } });

        await vi.advanceTimersByTimeAsync(AUTO_SAVE_DEBOUNCE_MS - 500);
        expect(mockedCreateInvoice).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(600);
        expect(mockedCreateInvoice).toHaveBeenCalledTimes(1);
      } finally {
        vi.useRealTimers();
      }
    });

    it("Discard draft and start over resets the saved invoice identity, so the next save creates a new invoice rather than updating the discarded one", async () => {
      saveDraftSnapshot({
        draft: {
          ...createEmptyDraft(),
          seller: "Acme Pty Ltd",
          customer: "Jane's Cafe",
          header: { ...createEmptyDraft().header, invoiceNumber: "INV-000001", issueDate: "2026-08-01", dueDate: "2026-08-15" },
        },
        lineItems: [{ ...createEmptyLineItem(), description: "Consulting", unitPrice: "50" }],
        invoiceDiscountType: "None",
        invoiceDiscountValue: "",
        supportingContent: createEmptySupportingContent(),
      });
      mockedGetCurrentSession.mockResolvedValue(AUTHENTICATED_ACCOUNT);
      mockedCreateInvoice.mockResolvedValue(SAVED_INVOICE);
      const user = userEvent.setup();
      render(<CreateInvoiceEditor />);
      await waitFor(() => expect(mockedGetCurrentSession).toHaveResolvedTimes(1));
      expect(await screen.findByLabelText("From", { exact: false })).toHaveValue("Acme Pty Ltd");
      await user.click(screen.getByRole("button", { name: "Save" }));
      await waitFor(() => expect(mockedCreateInvoice).toHaveBeenCalledTimes(1));

      await user.click(screen.getByRole("button", { name: "Discard draft and start over" }));
      await fillValidInvoice(user);
      await user.click(screen.getByRole("button", { name: "Save" }));

      await waitFor(() => expect(mockedCreateInvoice).toHaveBeenCalledTimes(2));
      expect(mockedUpdateInvoice).not.toHaveBeenCalled();
    });

    it("does not attempt a remote auto-save for an anonymous visitor", async () => {
      const user = userEvent.setup();
      render(<CreateInvoiceEditor />);
      await waitFor(() => expect(screen.getByRole("button", { name: /Classic/ })).toBeInTheDocument());
      await fillValidInvoice(user);

      vi.useFakeTimers();
      try {
        await vi.advanceTimersByTimeAsync(AUTO_SAVE_DEBOUNCE_MS + 500);
        expect(mockedCreateInvoice).not.toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe("IG-56: select a saved customer on an invoice", () => {
    const SAMPLE_CUSTOMER = {
      id: "customer-42",
      businessName: "Acme Pty Ltd",
      contactName: "Jamie Lee",
      email: "billing@acme.example",
      phone: null,
      addressLine1: "1 Main St",
      addressLine2: null,
      city: "Sydney",
      state: "NSW",
      postalCode: "2000",
      country: "AU",
      taxNumber: null,
      notes: null,
      isArchived: false,
      createdAt: "2026-08-01T00:00:00Z",
      updatedAt: "2026-08-01T00:00:00Z",
    };

    it("hides the customer search box for an anonymous visitor", async () => {
      render(<CreateInvoiceEditor />);
      await waitFor(() => expect(mockedGetCurrentSession).toHaveResolvedTimes(1));

      expect(screen.queryByLabelText("Search saved customers")).not.toBeInTheDocument();
      expect(mockedListCustomers).not.toHaveBeenCalled();
    });

    it("shows the customer search box and fetches saved customers for an authenticated visitor", async () => {
      mockedGetCurrentSession.mockResolvedValue(AUTHENTICATED_ACCOUNT);
      render(<CreateInvoiceEditor />);

      expect(await screen.findByLabelText("Search saved customers")).toBeInTheDocument();
      await waitFor(() => expect(mockedListCustomers).toHaveBeenCalledTimes(1));
    });

    it("selecting a matching customer fills Bill To and includes its id in the save payload", async () => {
      mockedGetCurrentSession.mockResolvedValue(AUTHENTICATED_ACCOUNT);
      mockedListCustomers.mockResolvedValue([SAMPLE_CUSTOMER]);
      mockedCreateInvoice.mockResolvedValue(SAVED_INVOICE);
      const user = userEvent.setup();
      render(<CreateInvoiceEditor />);
      await waitFor(() => expect(mockedListCustomers).toHaveBeenCalledTimes(1));

      await user.type(screen.getByLabelText("Search saved customers"), "Acme");
      await user.click(await screen.findByRole("button", { name: /Acme Pty Ltd/ }));

      expect(screen.getByLabelText("Bill To", { exact: false })).toHaveValue("Acme Pty Ltd\nJamie Lee\n1 Main St\nSydney, NSW, 2000\nAU");

      await user.type(screen.getByLabelText(/Invoice Number/), "INV-000001");
      await user.type(screen.getByLabelText("From", { exact: false }), "My Business");
      await user.type(screen.getByLabelText("Description", { exact: false }), "Consulting");
      await user.type(screen.getByLabelText(/Unit Price/), "50");
      await user.click(screen.getByRole("button", { name: "Save" }));

      await waitFor(() => expect(mockedCreateInvoice).toHaveBeenCalledTimes(1));
      expect(mockedCreateInvoice).toHaveBeenCalledWith(expect.objectContaining({ customerId: "customer-42" }));
    });

    it("clears the recorded customer id once the filled-in Bill To text is hand-edited", async () => {
      mockedGetCurrentSession.mockResolvedValue(AUTHENTICATED_ACCOUNT);
      mockedListCustomers.mockResolvedValue([SAMPLE_CUSTOMER]);
      mockedCreateInvoice.mockResolvedValue(SAVED_INVOICE);
      const user = userEvent.setup();
      render(<CreateInvoiceEditor />);
      await waitFor(() => expect(mockedListCustomers).toHaveBeenCalledTimes(1));

      await user.type(screen.getByLabelText("Search saved customers"), "Acme");
      await user.click(await screen.findByRole("button", { name: /Acme Pty Ltd/ }));
      await user.type(screen.getByLabelText("Bill To", { exact: false }), " (edited)");

      await user.type(screen.getByLabelText(/Invoice Number/), "INV-000001");
      await user.type(screen.getByLabelText("From", { exact: false }), "My Business");
      await user.type(screen.getByLabelText("Description", { exact: false }), "Consulting");
      await user.type(screen.getByLabelText(/Unit Price/), "50");
      await user.click(screen.getByRole("button", { name: "Save" }));

      await waitFor(() => expect(mockedCreateInvoice).toHaveBeenCalledTimes(1));
      expect(mockedCreateInvoice).toHaveBeenCalledWith(expect.objectContaining({ customerId: null }));
    });

    it("shows no matches message when the search text does not match any saved customer", async () => {
      mockedGetCurrentSession.mockResolvedValue(AUTHENTICATED_ACCOUNT);
      mockedListCustomers.mockResolvedValue([SAMPLE_CUSTOMER]);
      const user = userEvent.setup();
      render(<CreateInvoiceEditor />);
      await waitFor(() => expect(mockedListCustomers).toHaveBeenCalledTimes(1));

      await user.type(screen.getByLabelText("Search saved customers"), "Zephyr");

      expect(await screen.findByText("No matching customers.")).toBeInTheDocument();
    });

    it("does not search until at least 2 characters are typed", async () => {
      mockedGetCurrentSession.mockResolvedValue(AUTHENTICATED_ACCOUNT);
      mockedListCustomers.mockResolvedValue([SAMPLE_CUSTOMER]);
      const user = userEvent.setup();
      render(<CreateInvoiceEditor />);
      await waitFor(() => expect(mockedListCustomers).toHaveBeenCalledTimes(1));

      await user.type(screen.getByLabelText("Search saved customers"), "A");

      expect(screen.queryByRole("button", { name: /Acme Pty Ltd/ })).not.toBeInTheDocument();
      expect(screen.queryByText("No matching customers.")).not.toBeInTheDocument();
    });
  });

  describe("IG-51: pre-fill a new invoice from the business profile", () => {
    it("pre-fills Seller, Currency, Due Date, Notes and Terms on a fresh authenticated visit", async () => {
      mockedGetCurrentSession.mockResolvedValue(AUTHENTICATED_ACCOUNT);
      mockedGetBusinessProfile.mockResolvedValue(SAMPLE_BUSINESS_PROFILE);
      render(<CreateInvoiceEditor />);

      await waitFor(() => expect(mockedGetBusinessProfile).toHaveResolvedTimes(1));
      await waitFor(() => expect((screen.getByLabelText("From", { exact: false }) as HTMLTextAreaElement).value).toContain("Acme Pty Ltd"));

      expect((screen.getByLabelText("From", { exact: false }) as HTMLTextAreaElement).value).toContain("billing@acme.example");
      expect(screen.getByLabelText("Currency")).toHaveValue("USD");
      // Net14 from today - computed the same way production code does (todayIsoDate + 14 days),
      // not a fixed date, so this doesn't need fake timers (which don't mix safely with waitFor).
      const expectedDueDate = new Date();
      expectedDueDate.setDate(expectedDueDate.getDate() + 14);
      const expectedDueDateIso = `${expectedDueDate.getFullYear()}-${String(expectedDueDate.getMonth() + 1).padStart(2, "0")}-${String(expectedDueDate.getDate()).padStart(2, "0")}`;
      expect(screen.getByLabelText(/Due Date/)).toHaveValue(expectedDueDateIso);
      expect(screen.getByLabelText("Notes", { exact: false })).toHaveValue("Thanks for your business");
      expect(screen.getByLabelText("Terms and Conditions", { exact: false })).toHaveValue("Payment due within terms");
    });

    it("does not fetch or apply the profile when a localStorage draft was restored instead", async () => {
      saveDraftSnapshot({
        draft: { ...createEmptyDraft(), seller: "Restored Business" },
        lineItems: [createEmptyLineItem()],
        invoiceDiscountType: "None",
        invoiceDiscountValue: "",
        supportingContent: createEmptySupportingContent(),
      });
      mockedGetCurrentSession.mockResolvedValue(AUTHENTICATED_ACCOUNT);
      mockedGetBusinessProfile.mockResolvedValue(SAMPLE_BUSINESS_PROFILE);
      render(<CreateInvoiceEditor />);

      expect(await screen.findByLabelText("From", { exact: false })).toHaveValue("Restored Business");
      await waitFor(() => expect(mockedGetCurrentSession).toHaveResolvedTimes(1));
      expect(mockedGetBusinessProfile).not.toHaveBeenCalled();
    });

    it("does not fetch the business profile for an anonymous visitor", async () => {
      mockedGetBusinessProfile.mockResolvedValue(SAMPLE_BUSINESS_PROFILE);
      render(<CreateInvoiceEditor />);

      await waitFor(() => expect(mockedGetCurrentSession).toHaveResolvedTimes(1));
      expect(mockedGetBusinessProfile).not.toHaveBeenCalled();
    });

    it("does not overwrite text the visitor already typed before the profile fetch resolves", async () => {
      let resolveProfile: (profile: typeof SAMPLE_BUSINESS_PROFILE) => void = () => {};
      mockedGetBusinessProfile.mockReturnValue(new Promise((resolve) => { resolveProfile = resolve; }));
      mockedGetCurrentSession.mockResolvedValue(AUTHENTICATED_ACCOUNT);
      const user = userEvent.setup();
      render(<CreateInvoiceEditor />);
      await waitFor(() => expect(mockedGetCurrentSession).toHaveResolvedTimes(1));

      await user.type(screen.getByLabelText("From", { exact: false }), "My Own Business");
      resolveProfile(SAMPLE_BUSINESS_PROFILE);
      await waitFor(() => expect(mockedGetBusinessProfile).toHaveResolvedTimes(1));

      expect(screen.getByLabelText("From", { exact: false })).toHaveValue("My Own Business");
    });

    it("leaves the form blank, without error, when the profile fetch fails", async () => {
      mockedGetCurrentSession.mockResolvedValue(AUTHENTICATED_ACCOUNT);
      mockedGetBusinessProfile.mockRejectedValue(new Error("Failed to load your business profile."));
      render(<CreateInvoiceEditor />);

      await waitFor(() => expect(mockedGetBusinessProfile).toHaveBeenCalledTimes(1));
      expect(screen.getByLabelText("From", { exact: false })).toHaveValue("");
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });
});
