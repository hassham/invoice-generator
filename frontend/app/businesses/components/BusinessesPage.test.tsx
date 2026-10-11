import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createBusiness, listBusinesses, type BusinessProfile } from "../../lib/business";
import { BusinessProvider } from "../../lib/BusinessContext";
import { BusinessesPage } from "./BusinessesPage";

vi.mock("../../lib/business", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../lib/business")>()),
  listBusinesses: vi.fn(),
  createBusiness: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const mockedListBusinesses = vi.mocked(listBusinesses);
const mockedCreateBusiness = vi.mocked(createBusiness);

function business(overrides: Partial<BusinessProfile>): BusinessProfile {
  return {
    id: "biz-1",
    businessName: "Acme Pty Ltd",
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
    defaultTaxRate: 10,
    taxCalculationMethod: "Exclusive",
    defaultPaymentTerms: "Net30",
    defaultPaymentTermsDays: null,
    defaultInvoiceNotes: null,
    defaultTermsAndConditions: null,
    defaultTemplateId: null,
    invoicePrefix: "INV-",
    nextInvoiceNumber: 1,
    invoiceNumberPadding: 4,
    logoUrl: null,
    stripeAccountId: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  } as BusinessProfile;
}

function renderPage() {
  return render(
    <BusinessProvider>
      <BusinessesPage />
    </BusinessProvider>
  );
}

describe("BusinessesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it("lists each business and marks the one that is selected", async () => {
    window.localStorage.setItem("selectedBusinessId", "biz-2");
    mockedListBusinesses.mockResolvedValue([
      business({ id: "biz-1", businessName: "Acme Pty Ltd" }),
      business({ id: "biz-2", businessName: "Side Project", country: "NZ", defaultCurrency: "NZD" }),
    ]);

    renderPage();

    expect(await screen.findByText("Side Project")).toBeInTheDocument();
    expect(screen.getByText("Acme Pty Ltd")).toBeInTheDocument();
    expect(screen.getByText("Selected")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Use Acme Pty Ltd" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Use Side Project" })).not.toBeInTheDocument();
  });

  it("stores the business the user picks", async () => {
    mockedListBusinesses.mockResolvedValue([
      business({ id: "biz-1", businessName: "Acme Pty Ltd" }),
      business({ id: "biz-2", businessName: "Side Project" }),
    ]);
    renderPage();
    await screen.findByText("Side Project");

    await userEvent.click(screen.getByRole("button", { name: "Use Side Project" }));

    expect(window.localStorage.getItem("selectedBusinessId")).toBe("biz-2");
  });

  it("shows a clear message when the list cannot be loaded", async () => {
    mockedListBusinesses.mockRejectedValue(new Error("network down"));

    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't load your businesses");
  });

  it("creates a business, selects it and adds it to the list", async () => {
    mockedListBusinesses.mockResolvedValue([business({ id: "biz-1", businessName: "Acme Pty Ltd" })]);
    mockedCreateBusiness.mockResolvedValue(business({ id: "biz-new", businessName: "Second Co", country: "NZ", defaultCurrency: "NZD" }));
    renderPage();
    await screen.findByText("Acme Pty Ltd");

    await userEvent.click(screen.getByRole("button", { name: "New business" }));
    await userEvent.type(screen.getByLabelText("Business name"), "  Second Co  ");
    await userEvent.clear(screen.getByLabelText("Country code"));
    await userEvent.type(screen.getByLabelText("Country code"), "nz");
    await userEvent.clear(screen.getByLabelText("Currency code"));
    await userEvent.type(screen.getByLabelText("Currency code"), "nzd");
    await userEvent.click(screen.getByRole("button", { name: "Create business" }));

    await waitFor(() => expect(screen.getByText("Second Co")).toBeInTheDocument());
    expect(mockedCreateBusiness).toHaveBeenCalledWith({
      businessName: "Second Co",
      country: "NZ",
      defaultCurrency: "NZD",
    });
    expect(window.localStorage.getItem("selectedBusinessId")).toBe("biz-new");
  });

  it("keeps the form open and shows the server's reason when creating fails", async () => {
    mockedListBusinesses.mockResolvedValue([]);
    mockedCreateBusiness.mockRejectedValue(new Error("Country must be a 2-letter country code."));
    renderPage();
    await screen.findByRole("button", { name: "New business" });

    await userEvent.click(screen.getByRole("button", { name: "New business" }));
    await userEvent.type(screen.getByLabelText("Business name"), "Acme");
    await userEvent.click(screen.getByRole("button", { name: "Create business" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Country must be a 2-letter country code.");
    expect(screen.getByLabelText("Business name")).toHaveValue("Acme");
    expect(window.localStorage.getItem("selectedBusinessId")).toBeNull();
  });
});
