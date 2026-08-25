import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import {
  createEmptySupportingContent,
  hasAnySupportingContentError,
  validateSupportingContent,
  type SupportingContentErrors,
} from "../lib/supportingContent";
import { SupportingContentSection } from "./SupportingContentSection";

function StatefulSupportingContentSection() {
  const [values, setValues] = useState(createEmptySupportingContent);
  const [errors, setErrors] = useState<SupportingContentErrors>({ paymentInstructions: {} });

  const revalidateIfTouched = (next: typeof values) => {
    if (hasAnySupportingContentError(errors)) {
      setErrors(validateSupportingContent(next));
    }
  };

  return (
    <SupportingContentSection
      values={values}
      errors={errors}
      onFieldChange={(name, value) => {
        const next = { ...values, [name]: value };
        setValues(next);
        revalidateIfTouched(next);
      }}
      onFieldBlur={() => setErrors(validateSupportingContent(values))}
      onPaymentInstructionChange={(name, value) => {
        const next = { ...values, paymentInstructions: { ...values.paymentInstructions, [name]: value } };
        setValues(next);
        revalidateIfTouched(next);
      }}
      onPaymentInstructionBlur={() => setErrors(validateSupportingContent(values))}
    />
  );
}

describe("SupportingContentSection", () => {
  it("renders Notes, Terms and Conditions, and the payment instruction fields", () => {
    render(<StatefulSupportingContentSection />);

    expect(screen.getByLabelText("Notes")).toBeInTheDocument();
    expect(screen.getByLabelText("Terms and Conditions")).toBeInTheDocument();
    expect(screen.getByLabelText("Bank Name")).toBeInTheDocument();
    expect(screen.getByLabelText("IBAN")).toBeInTheDocument();
    expect(screen.getByLabelText("SWIFT")).toBeInTheDocument();
    expect(screen.getByLabelText("Custom Instructions")).toBeInTheDocument();
  });

  it("shows no errors when every field is empty - all are optional", async () => {
    const user = userEvent.setup();
    render(<StatefulSupportingContentSection />);

    await user.click(screen.getByLabelText("Notes"));
    await user.tab();

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("keeps typed content in Notes and Bank Name independently", async () => {
    const user = userEvent.setup();
    render(<StatefulSupportingContentSection />);

    await user.type(screen.getByLabelText("Notes"), "Thank you for your business.");
    await user.type(screen.getByLabelText("Bank Name"), "Big Bank");

    expect(screen.getByLabelText("Notes")).toHaveValue("Thank you for your business.");
    expect(screen.getByLabelText("Bank Name")).toHaveValue("Big Bank");
  });
});
