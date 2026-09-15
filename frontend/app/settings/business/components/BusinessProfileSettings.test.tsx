import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchTemplates } from "../../../invoice/create/lib/templates";
import { getBusinessProfile, updateBusinessProfile, type BusinessProfile } from "../../../lib/business";
import { BusinessProfileSettings } from "./BusinessProfileSettings";

const replaceMock = vi.fn();
// IG-219: reads ?stripeConnected=/?stripeConnectError= via useSearchParams and cleans the URL via
// useRouter().replace() - defaults to no query params (matching the pre-IG-219 behavior of every
// test in this file that doesn't care about it); tests that specifically exercise it override
// currentSearchParams per-test. Same mock shape as InvoiceListView.test.tsx/CreateInvoiceEditor.test.tsx.
let currentSearchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
  useSearchParams: () => currentSearchParams,
}));

vi.mock("../../../invoice/create/lib/templates", () => ({
  fetchTemplates: vi.fn(() => Promise.resolve([])),
}));

vi.mock("../../../lib/business", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../lib/business")>()),
  getBusinessProfile: vi.fn(),
  updateBusinessProfile: vi.fn(),
}));

const mockedFetchTemplates = vi.mocked(fetchTemplates);
const mockedGetBusinessProfile = vi.mocked(getBusinessProfile);
const mockedUpdateBusinessProfile = vi.mocked(updateBusinessProfile);

const sampleProfile: BusinessProfile = {
  id: "biz-1",
  businessName: "Acme Pty Ltd",
  legalName: null,
  email: "billing@acme.example",
  phone: null,
  website: null,
  addressLine1: null,
  addressLine2: null,
  city: null,
  state: null,
  postalCode: null,
  country: "AU",
  registrationNumber: null,
  taxNumber: null,
  defaultCurrency: "AUD",
  defaultTaxRate: 10,
  taxCalculationMethod: "Exclusive",
  defaultPaymentTerms: "DueOnReceipt",
  defaultPaymentTermsDays: null,
  defaultInvoiceNotes: null,
  defaultTermsAndConditions: null,
  defaultTemplateId: null,
  invoicePrefix: "INV-",
  nextInvoiceNumber: 1,
  invoiceNumberPadding: 4,
  logoUrl: null,
  stripeAccountId: null,
  createdAt: "2026-08-01T00:00:00Z",
  updatedAt: "2026-08-01T00:00:00Z",
};

describe("BusinessProfileSettings", () => {
  afterEach(() => {
    vi.clearAllMocks();
    currentSearchParams = new URLSearchParams();
  });

  it("shows a loading state before the profile resolves", () => {
    mockedGetBusinessProfile.mockReturnValue(new Promise(() => {}));
    mockedFetchTemplates.mockResolvedValue([]);

    render(<BusinessProfileSettings />);

    expect(screen.getByText("Loading your business profile…")).toBeInTheDocument();
  });

  it("shows an error state when the profile fails to load", async () => {
    mockedGetBusinessProfile.mockRejectedValue(new Error("Your session has expired. Please sign in again."));
    mockedFetchTemplates.mockResolvedValue([]);

    render(<BusinessProfileSettings />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Your session has expired. Please sign in again.");
  });

  it("loads the profile and pre-fills the form", async () => {
    mockedGetBusinessProfile.mockResolvedValue(sampleProfile);
    mockedFetchTemplates.mockResolvedValue([]);

    render(<BusinessProfileSettings />);

    expect(await screen.findByLabelText("Business Name")).toHaveValue("Acme Pty Ltd");
    expect(screen.getByLabelText("Email")).toHaveValue("billing@acme.example");
  });

  it("saves changes and shows a saved confirmation", async () => {
    mockedGetBusinessProfile.mockResolvedValue(sampleProfile);
    mockedFetchTemplates.mockResolvedValue([]);
    mockedUpdateBusinessProfile.mockResolvedValue({ ...sampleProfile, businessName: "Acme Holdings" });
    const user = userEvent.setup();

    render(<BusinessProfileSettings />);
    await screen.findByLabelText("Business Name");

    await user.clear(screen.getByLabelText("Business Name"));
    await user.type(screen.getByLabelText("Business Name"), "Acme Holdings");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Changes saved.");
    await waitFor(() => expect(mockedUpdateBusinessProfile).toHaveBeenCalledWith(expect.objectContaining({ businessName: "Acme Holdings" })));
  });

  it("shows a server error banner when saving fails", async () => {
    mockedGetBusinessProfile.mockResolvedValue(sampleProfile);
    mockedFetchTemplates.mockResolvedValue([]);
    mockedUpdateBusinessProfile.mockRejectedValue(new Error("Business name is required."));
    const user = userEvent.setup();

    render(<BusinessProfileSettings />);
    await screen.findByLabelText("Business Name");

    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Business name is required.");
  });

  describe("Stripe Connect redirect-back banner (IG-219)", () => {
    it("shows a success banner and strips the query param when ?stripeConnected=1", async () => {
      currentSearchParams = new URLSearchParams({ stripeConnected: "1" });
      mockedGetBusinessProfile.mockResolvedValue(sampleProfile);
      mockedFetchTemplates.mockResolvedValue([]);

      render(<BusinessProfileSettings />);

      expect(await screen.findByRole("status")).toHaveTextContent("Stripe account connected.");
      expect(replaceMock).toHaveBeenCalledWith("/settings/business");
    });

    it("shows an error banner when ?stripeConnectError=1", async () => {
      currentSearchParams = new URLSearchParams({ stripeConnectError: "1" });
      mockedGetBusinessProfile.mockResolvedValue(sampleProfile);
      mockedFetchTemplates.mockResolvedValue([]);

      render(<BusinessProfileSettings />);

      expect(await screen.findByRole("alert")).toHaveTextContent("Failed to connect your Stripe account. Please try again.");
    });

    it("shows neither banner when no Stripe query param is present", async () => {
      mockedGetBusinessProfile.mockResolvedValue(sampleProfile);
      mockedFetchTemplates.mockResolvedValue([]);

      render(<BusinessProfileSettings />);

      await screen.findByLabelText("Business Name");
      expect(screen.queryByText("Stripe account connected.")).not.toBeInTheDocument();
      expect(screen.queryByText(/Failed to connect your Stripe account/)).not.toBeInTheDocument();
      expect(replaceMock).not.toHaveBeenCalled();
    });
  });
});
