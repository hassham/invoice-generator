import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchTemplates } from "../../../invoice/create/lib/templates";
import { getBusinessProfile, updateBusinessProfile, type BusinessProfile } from "../../../lib/business";
import { BusinessProfileSettings } from "./BusinessProfileSettings";

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
  createdAt: "2026-08-01T00:00:00Z",
  updatedAt: "2026-08-01T00:00:00Z",
};

describe("BusinessProfileSettings", () => {
  afterEach(() => {
    vi.clearAllMocks();
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
});
