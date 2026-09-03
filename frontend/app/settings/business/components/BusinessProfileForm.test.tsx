import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchTemplates } from "../../../invoice/create/lib/templates";
import { BusinessProfileForm, type BusinessProfileFormValues } from "./BusinessProfileForm";

vi.mock("../../../invoice/create/lib/templates", () => ({
  fetchTemplates: vi.fn(() => Promise.resolve([])),
}));

const mockedFetchTemplates = vi.mocked(fetchTemplates);

const emptyValues: BusinessProfileFormValues = {
  businessName: "",
  legalName: "",
  email: "",
  phone: "",
  website: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "AU",
  registrationNumber: "",
  taxNumber: "",
  defaultCurrency: "AUD",
  defaultTaxRate: "0",
  taxCalculationMethod: "Exclusive",
  defaultPaymentTerms: "DueOnReceipt",
  defaultPaymentTermsDays: "",
  defaultInvoiceNotes: "",
  defaultTermsAndConditions: "",
  defaultTemplateId: "",
  invoicePrefix: "INV-",
  nextInvoiceNumber: "1",
  invoiceNumberPadding: "4",
};

describe("BusinessProfileForm", () => {
  beforeEach(() => {
    mockedFetchTemplates.mockResolvedValue([]);
  });

  it("rejects submission with a blank business name", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<BusinessProfileForm initialValues={emptyValues} submitting={false} error={null} onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Business name is required.");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits a request with blank optional fields converted to null and numeric fields parsed", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<BusinessProfileForm initialValues={emptyValues} submitting={false} error={null} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Business Name"), "Acme Pty Ltd");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        businessName: "Acme Pty Ltd",
        legalName: null,
        country: "AU",
        defaultCurrency: "AUD",
        defaultTaxRate: 0,
        taxCalculationMethod: "Exclusive",
        defaultPaymentTerms: "DueOnReceipt",
        defaultPaymentTermsDays: null,
      }),
    );
  });

  it("pre-fills every field from initialValues", () => {
    render(
      <BusinessProfileForm
        initialValues={{ ...emptyValues, businessName: "Acme Pty Ltd", email: "billing@acme.example", defaultTaxRate: "10" }}
        submitting={false}
        error={null}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Business Name")).toHaveValue("Acme Pty Ltd");
    expect(screen.getByLabelText("Email")).toHaveValue("billing@acme.example");
    expect(screen.getByLabelText("Default Tax Rate (%)")).toHaveValue(10);
  });

  it("only shows the custom payment-terms day field when Custom is selected", async () => {
    const user = userEvent.setup();
    render(<BusinessProfileForm initialValues={emptyValues} submitting={false} error={null} onSubmit={vi.fn()} />);

    expect(screen.queryByLabelText("Custom Terms (Days)")).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Default Payment Terms"), "Custom");

    expect(screen.getByLabelText("Custom Terms (Days)")).toBeInTheDocument();
  });

  it("includes the custom payment-terms day count only when Custom is selected", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<BusinessProfileForm initialValues={{ ...emptyValues, businessName: "Acme Pty Ltd" }} submitting={false} error={null} onSubmit={onSubmit} />);

    await user.selectOptions(screen.getByLabelText("Default Payment Terms"), "Custom");
    await user.type(screen.getByLabelText("Custom Terms (Days)"), "45");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ defaultPaymentTerms: "Custom", defaultPaymentTermsDays: 45 }));
  });

  it("shows the server error banner and disables submit while submitting", () => {
    render(<BusinessProfileForm initialValues={emptyValues} submitting error="Failed to save your business profile." onSubmit={vi.fn()} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Failed to save your business profile.");
    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
  });

  describe("invoice numbering (IG-54)", () => {
    it("shows a live preview of the generated invoice number that updates as the fields change", async () => {
      const user = userEvent.setup();
      render(<BusinessProfileForm initialValues={emptyValues} submitting={false} error={null} onSubmit={vi.fn()} />);

      expect(screen.getByText("INV-0001")).toBeInTheDocument();

      await user.clear(screen.getByLabelText("Prefix"));
      await user.type(screen.getByLabelText("Prefix"), "ACME-");
      await user.clear(screen.getByLabelText("Next Number"));
      await user.type(screen.getByLabelText("Next Number"), "500");

      expect(screen.getByText("ACME-0500")).toBeInTheDocument();
    });

    it("submits the numbering fields as parsed numbers", async () => {
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      render(
        <BusinessProfileForm
          initialValues={{ ...emptyValues, businessName: "Acme Pty Ltd" }}
          submitting={false}
          error={null}
          onSubmit={onSubmit}
        />,
      );

      await user.clear(screen.getByLabelText("Next Number"));
      await user.type(screen.getByLabelText("Next Number"), "1001");
      await user.clear(screen.getByLabelText("Number Padding"));
      await user.type(screen.getByLabelText("Number Padding"), "6");
      await user.click(screen.getByRole("button", { name: "Save changes" }));

      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ invoicePrefix: "INV-", nextInvoiceNumber: 1001, invoiceNumberPadding: 6 }));
    });
  });
});
