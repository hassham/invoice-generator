import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getBusinessProfile, updateBusinessProfile, type BusinessProfile } from "../../lib/business";
import { OnboardingWizard } from "./OnboardingWizard";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("../../lib/business", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../lib/business")>()),
  getBusinessProfile: vi.fn(),
  updateBusinessProfile: vi.fn(),
}));

const mockedGetBusinessProfile = vi.mocked(getBusinessProfile);
const mockedUpdateBusinessProfile = vi.mocked(updateBusinessProfile);

function makeProfile(overrides: Partial<BusinessProfile> = {}): BusinessProfile {
  return {
    id: "business-1",
    businessName: "My Business",
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

describe("OnboardingWizard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads the profile and shows the first step", async () => {
    mockedGetBusinessProfile.mockResolvedValue(makeProfile());

    render(<OnboardingWizard />);

    expect(await screen.findByLabelText("Business Name")).toHaveValue("My Business");
    expect(screen.getByText("Step 1 of 5: Business Name")).toBeInTheDocument();
  });

  it("saves the edited value and advances on 'Save & Continue'", async () => {
    const user = userEvent.setup();
    mockedGetBusinessProfile.mockResolvedValue(makeProfile());
    mockedUpdateBusinessProfile.mockResolvedValue(makeProfile({ businessName: "Acme Holdings" }));

    render(<OnboardingWizard />);
    await user.clear(await screen.findByLabelText("Business Name"));
    await user.type(screen.getByLabelText("Business Name"), "Acme Holdings");
    await user.click(screen.getByRole("button", { name: "Save & Continue" }));

    expect(await screen.findByText("Step 2 of 5: Country")).toBeInTheDocument();
    expect(mockedUpdateBusinessProfile).toHaveBeenCalledWith(expect.objectContaining({ businessName: "Acme Holdings" }));
  });

  it("'Skip this step' reverts this step's own edit but advances, without blocking progress", async () => {
    const user = userEvent.setup();
    mockedGetBusinessProfile.mockResolvedValue(makeProfile({ businessName: "Original Name" }));
    mockedUpdateBusinessProfile.mockResolvedValue(makeProfile({ businessName: "Original Name" }));

    render(<OnboardingWizard />);
    await user.clear(await screen.findByLabelText("Business Name"));
    await user.type(screen.getByLabelText("Business Name"), "Accidentally Typed");
    await user.click(screen.getByRole("button", { name: "Skip this step" }));

    expect(await screen.findByText("Step 2 of 5: Country")).toBeInTheDocument();
    // The skipped step's own field was reverted to its last-saved value, not the just-typed one.
    expect(mockedUpdateBusinessProfile).toHaveBeenCalledWith(expect.objectContaining({ businessName: "Original Name" }));
  });

  it("carries forward an earlier step's saved edit when skipping a later step", async () => {
    const user = userEvent.setup();
    mockedGetBusinessProfile.mockResolvedValue(makeProfile());
    mockedUpdateBusinessProfile.mockImplementation((request) =>
      Promise.resolve(makeProfile({ businessName: request.businessName, country: request.country })),
    );

    render(<OnboardingWizard />);
    await user.clear(await screen.findByLabelText("Business Name"));
    await user.type(screen.getByLabelText("Business Name"), "Acme Holdings");
    await user.click(screen.getByRole("button", { name: "Save & Continue" }));

    await screen.findByText("Step 2 of 5: Country");
    await user.click(screen.getByRole("button", { name: "Skip this step" }));

    await screen.findByText("Step 3 of 5: Currency");
    expect(mockedUpdateBusinessProfile).toHaveBeenLastCalledWith(expect.objectContaining({ businessName: "Acme Holdings" }));
  });

  it("'Skip onboarding' navigates away immediately without saving", async () => {
    const user = userEvent.setup();
    mockedGetBusinessProfile.mockResolvedValue(makeProfile());

    render(<OnboardingWizard />);
    await screen.findByLabelText("Business Name");
    await user.click(screen.getByRole("button", { name: "Skip onboarding" }));

    expect(pushMock).toHaveBeenCalledWith("/invoice/create");
    expect(mockedUpdateBusinessProfile).not.toHaveBeenCalled();
  });

  it("the last step's button reads 'Start Creating Invoices' and finishes onboarding", async () => {
    const user = userEvent.setup();
    mockedGetBusinessProfile.mockResolvedValue(makeProfile());
    mockedUpdateBusinessProfile.mockResolvedValue(makeProfile());

    render(<OnboardingWizard />);
    await screen.findByLabelText("Business Name");

    for (let step = 0; step < 4; step += 1) {
      await user.click(screen.getByRole("button", { name: "Skip this step" }));
      await screen.findByText(`Step ${step + 2} of 5: ${["Country", "Currency", "Tax Registration", "Logo"][step]}`);
    }

    expect(screen.queryByRole("button", { name: "Skip this step" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Start Creating Invoices" }));

    expect(pushMock).toHaveBeenCalledWith("/invoice/create");
  });

  it("shows a server error and stays on the current step when saving fails", async () => {
    const user = userEvent.setup();
    mockedGetBusinessProfile.mockResolvedValue(makeProfile());
    mockedUpdateBusinessProfile.mockRejectedValue(new Error("Business name is required."));

    render(<OnboardingWizard />);
    await user.clear(await screen.findByLabelText("Business Name"));
    await user.click(screen.getByRole("button", { name: "Save & Continue" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Business name is required.");
    expect(screen.getByText("Step 1 of 5: Business Name")).toBeInTheDocument();
  });
});
