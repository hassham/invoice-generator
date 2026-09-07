import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { processLogoUpload } from "../../invoice/create/lib/logoUpload";
import { removeBusinessLogo, uploadBusinessLogo, type BusinessProfile } from "../../lib/business";
import { BusinessLogoUpload } from "./BusinessLogoUpload";

vi.mock("../../invoice/create/lib/logoUpload", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../invoice/create/lib/logoUpload")>()),
  processLogoUpload: vi.fn(),
}));

vi.mock("../../lib/business", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../lib/business")>()),
  uploadBusinessLogo: vi.fn(),
  removeBusinessLogo: vi.fn(),
}));

const mockedProcessLogoUpload = vi.mocked(processLogoUpload);
const mockedUploadBusinessLogo = vi.mocked(uploadBusinessLogo);
const mockedRemoveBusinessLogo = vi.mocked(removeBusinessLogo);

function makeFile(name = "logo.png") {
  return new File([new Uint8Array([1, 2, 3])], name, { type: "image/png" });
}

function makeProfile(overrides: Partial<BusinessProfile> = {}): BusinessProfile {
  return {
    id: "business-1",
    businessName: "Acme",
    legalName: null,
    email: null,
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
    defaultTaxRate: 0,
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
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("BusinessLogoUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uploads the resized file and calls onChange with the updated profile", async () => {
    const user = userEvent.setup();
    mockedProcessLogoUpload.mockResolvedValue({ dataUrl: "data:image/png;base64,AQID" });
    const updatedProfile = makeProfile({ logoUrl: "/api/v1/business/logo/business-1" });
    mockedUploadBusinessLogo.mockResolvedValue(updatedProfile);
    const onChange = vi.fn();
    render(<BusinessLogoUpload logoUrl={null} onChange={onChange} />);

    await user.upload(screen.getByLabelText("Upload logo"), makeFile());

    expect(mockedUploadBusinessLogo).toHaveBeenCalledWith(expect.any(Blob), "logo.png");
    expect(onChange).toHaveBeenCalledWith(updatedProfile);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows the validation error and does not upload when the file fails validation", async () => {
    const user = userEvent.setup();
    mockedProcessLogoUpload.mockResolvedValue({ error: "Logo must be 5 MB or smaller." });
    const onChange = vi.fn();
    render(<BusinessLogoUpload logoUrl={null} onChange={onChange} />);

    await user.upload(screen.getByLabelText("Upload logo"), makeFile());

    expect(screen.getByRole("alert")).toHaveTextContent("Logo must be 5 MB or smaller.");
    expect(mockedUploadBusinessLogo).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("shows the server's error message when the upload request itself fails", async () => {
    const user = userEvent.setup();
    mockedProcessLogoUpload.mockResolvedValue({ dataUrl: "data:image/png;base64,AQID" });
    mockedUploadBusinessLogo.mockRejectedValue(new Error("This file doesn't look like a valid image."));
    const onChange = vi.fn();
    render(<BusinessLogoUpload logoUrl={null} onChange={onChange} />);

    await user.upload(screen.getByLabelText("Upload logo"), makeFile());

    expect(screen.getByRole("alert")).toHaveTextContent("This file doesn't look like a valid image.");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("shows a thumbnail and 'Remove logo' only when a logo is already set", () => {
    const { rerender } = render(<BusinessLogoUpload logoUrl={null} onChange={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Remove logo" })).not.toBeInTheDocument();
    expect(screen.queryByAltText("Business logo")).not.toBeInTheDocument();

    rerender(<BusinessLogoUpload logoUrl="/api/v1/business/logo/business-1" onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Remove logo" })).toBeInTheDocument();
    expect(screen.getByAltText("Business logo")).toHaveAttribute("src", expect.stringContaining("/api/v1/business/logo/business-1"));
  });

  it("clicking 'Remove logo' calls removeBusinessLogo and onChange with the result", async () => {
    const user = userEvent.setup();
    const updatedProfile = makeProfile({ logoUrl: null });
    mockedRemoveBusinessLogo.mockResolvedValue(updatedProfile);
    const onChange = vi.fn();
    render(<BusinessLogoUpload logoUrl="/api/v1/business/logo/business-1" onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Remove logo" }));

    expect(mockedRemoveBusinessLogo).toHaveBeenCalled();
    expect(onChange).toHaveBeenCalledWith(updatedProfile);
  });
});
