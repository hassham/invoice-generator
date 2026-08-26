import { describe, expect, it } from "vitest";
import { createEmptyDraft, hasAnyError, todayIsoDate, validateHeaderFields } from "./invoiceDraft";
import { getDefaultCustomization } from "./templateCustomization";

describe("createEmptyDraft", () => {
  it("defaults currency to AUD", () => {
    const draft = createEmptyDraft();

    expect(draft.currency).toBe("AUD");
  });

  it("starts every other field empty", () => {
    const draft = createEmptyDraft();

    expect(draft.header.invoiceNumber).toBe("");
    expect(draft.header.issueDate).toBe("");
    expect(draft.seller).toBe("");
    expect(draft.customer).toBe("");
    expect(draft.shipTo).toBe("");
  });

  it("defaults templateId empty and templateCustomization to Classic's defaults", () => {
    const draft = createEmptyDraft();

    expect(draft.templateId).toBe("");
    expect(draft.templateCustomization).toEqual(getDefaultCustomization("classic"));
  });

  it("defaults logo to null", () => {
    expect(createEmptyDraft().logo).toBeNull();
  });
});

describe("todayIsoDate", () => {
  it("returns today's date in yyyy-mm-dd form", () => {
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
      now.getDate(),
    ).padStart(2, "0")}`;

    expect(todayIsoDate()).toBe(expected);
  });
});

describe("validateHeaderFields", () => {
  const validHeader = {
    invoiceNumber: "INV-000001",
    issueDate: "2026-08-19",
    dueDate: "2026-09-02",
    reference: "",
  };

  it("accepts a fully valid header", () => {
    expect(hasAnyError(validateHeaderFields(validHeader))).toBe(false);
  });

  it("rejects a missing invoice number", () => {
    const errors = validateHeaderFields({ ...validHeader, invoiceNumber: "" });
    expect(errors.invoiceNumber).toBe("Invoice Number is required.");
  });

  it("rejects a due date earlier than the issue date - FSD section 12", () => {
    const errors = validateHeaderFields({ ...validHeader, dueDate: "2026-08-01" });
    expect(errors.dueDate).toBe("Due date cannot be earlier than the issue date.");
  });

  it("accepts a due date equal to the issue date (DueOnReceipt)", () => {
    const errors = validateHeaderFields({ ...validHeader, dueDate: validHeader.issueDate });
    expect(errors.dueDate).toBeUndefined();
  });

  it("accepts a due date after the issue date", () => {
    expect(validateHeaderFields(validHeader).dueDate).toBeUndefined();
  });
});

describe("hasAnyError", () => {
  it("is false when every value is undefined", () => {
    expect(hasAnyError({ a: undefined, b: undefined })).toBe(false);
  });

  it("is true when any value is a message", () => {
    expect(hasAnyError({ a: undefined, b: "required" })).toBe(true);
  });
});
