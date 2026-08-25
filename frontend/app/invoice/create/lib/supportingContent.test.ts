import { describe, expect, it } from "vitest";
import {
  createEmptySupportingContent,
  hasAnyPaymentInstructionContent,
  hasAnySupportingContentError,
  PAYMENT_INSTRUCTION_FIELDS,
  validateSupportingContent,
} from "./supportingContent";

describe("createEmptySupportingContent", () => {
  it("starts every field empty", () => {
    const content = createEmptySupportingContent();

    expect(content.notes).toBe("");
    expect(content.terms).toBe("");
    expect(content.customInstructions).toBe("");
    for (const field of PAYMENT_INSTRUCTION_FIELDS) {
      expect(content.paymentInstructions[field.name]).toBe("");
    }
  });
});

describe("validateSupportingContent", () => {
  it("accepts a fully empty state - every field is optional", () => {
    const errors = validateSupportingContent(createEmptySupportingContent());

    expect(hasAnySupportingContentError(errors)).toBe(false);
  });

  it("rejects notes over 2000 characters - FSD section 30", () => {
    const content = { ...createEmptySupportingContent(), notes: "a".repeat(2001) };

    const errors = validateSupportingContent(content);

    expect(errors.notes).toBe("Notes must be 2000 characters or fewer.");
  });

  it("rejects terms over 5000 characters - FSD section 31", () => {
    const content = { ...createEmptySupportingContent(), terms: "a".repeat(5001) };

    const errors = validateSupportingContent(content);

    expect(errors.terms).toBe("Terms and Conditions must be 5000 characters or fewer.");
  });

  it("rejects an over-length payment instruction field", () => {
    const content = createEmptySupportingContent();
    content.paymentInstructions.swift = "a".repeat(21);

    const errors = validateSupportingContent(content);

    expect(errors.paymentInstructions.swift).toBe("SWIFT must be 20 characters or fewer.");
  });
});

describe("hasAnyPaymentInstructionContent", () => {
  it("is false when every payment field and custom instructions are empty", () => {
    expect(hasAnyPaymentInstructionContent(createEmptySupportingContent())).toBe(false);
  });

  it("is true when any structured payment field has content", () => {
    const content = createEmptySupportingContent();
    content.paymentInstructions.bankName = "Big Bank";

    expect(hasAnyPaymentInstructionContent(content)).toBe(true);
  });

  it("is true when only custom instructions has content", () => {
    const content = { ...createEmptySupportingContent(), customInstructions: "Pay via carrier pigeon." };

    expect(hasAnyPaymentInstructionContent(content)).toBe(true);
  });
});
